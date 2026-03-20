// ✅ FUNCTION EXPORT
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const OtpSession = require("../models/OtpSession");
const User = require("../models/User");

const OTP_EXPIRY_MS = 5 * 60 * 1000; // ✅ 5 minutes

/* ---------- HELPERS ---------- */
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

/* ---------- WHATSAPP OTP SENDER ---------- */
const sendWhatsAppOtp = async (phone, otp) => {
  // Meta expects E.164 format — phone in your DB is 10 digits, so we prefix +91
  const e164Phone = `+91${phone}`;

  const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: e164Phone,
    type: "template",
    template: {
      name: "freshlaa_otp_verification", // ✅ your approved template name
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }],
        },
        {
          // Enables the "Copy Code" button in WhatsApp
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        },
      ],
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

/* ---------- SEND OTP ---------- */
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // 🔐 Prevent OTP overwrite while active
    const existing = await OtpSession.findOne({ phone });
    if (existing && existing.expiresAt > new Date()) {
      return res.status(429).json({
        success: false,
        message: "OTP already sent. Please wait.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    await OtpSession.findOneAndUpdate(
      { phone },
      {
        otpHash,
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      { upsert: true, new: true }
    );

    // 📩 Send via SMS + WhatsApp simultaneously
    const smsUrl = `https://apihome.in/panel/api/bulksms/?key=${process.env.SMS_API_KEY}&mobile=${phone}&otp=${otp}`;

    const [smsResult, whatsappResult] = await Promise.allSettled([
      axios.get(smsUrl),
      sendWhatsAppOtp(phone, otp),
    ]);

    // Log results for debugging
    if (smsResult.status === "rejected") {
      console.error("⚠️ SMS failed:", smsResult.reason?.message);
    } else {
      console.log("✅ SMS sent:", smsResult.value?.data?.status);
    }

    if (whatsappResult.status === "rejected") {
      console.error("⚠️ WhatsApp failed:", whatsappResult.reason?.response?.data || whatsappResult.reason?.message);
    } else {
      console.log("✅ WhatsApp OTP sent");
    }

    // ✅ If at least ONE channel succeeded, consider it a success
    const smsSent = smsResult.status === "fulfilled" && smsResult.value?.data?.status === "Success";
    const whatsappSent = whatsappResult.status === "fulfilled";

    if (!smsSent && !whatsappSent) {
      return res.status(500).json({
        success: false,
        message: "OTP sending failed on all channels",
      });
    }

    return res.json({
      success: true,
      message: "OTP sent successfully",
      channels: {
        sms: smsSent,
        whatsapp: whatsappSent,
      },
      expiresIn: OTP_EXPIRY_MS / 1000,
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "OTP send failed",
    });
  }
};

/* ---------- VERIFY OTP ---------- */
// ✅ Zero changes — works exactly as before
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone and OTP are required",
      });
    }

    // 🔒 OTP format check
    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format",
      });
    }

    const session = await OtpSession.findOne({ phone });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found",
      });
    }

    if (session.expiresAt < new Date()) {
      await OtpSession.deleteOne({ phone });
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    session.attempts += 1;

    if (session.attempts > 5) {
      await OtpSession.deleteOne({ phone });
      return res.status(429).json({
        success: false,
        message: "Too many attempts",
      });
    }

    // 🔑 OTP match
    if (session.otpHash !== hashOtp(otp)) {
      await session.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ OTP SUCCESS
    await OtpSession.deleteOne({ phone });

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

/* ================= EXPORTS ================= */
module.exports = {
  sendOtp,
  verifyOtp,
};