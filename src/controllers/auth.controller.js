const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const OtpSession = require("../models/OtpSession");
const User = require("../models/User");

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

/* ================= HELPERS ================= */
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const normalizePhone = (phone) =>
  phone.replace(/^(\+91)/, "").trim();

/* ================= SEND OTP ================= */
const sendOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    phone = normalizePhone(phone);

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    // Remove previous OTP
    await OtpSession.deleteMany({ phone });

    // Send SMS
    const smsUrl = `https://apihome.in/panel/api/bulksms/?key=${process.env.SMS_API_KEY}&mobile=${phone}&otp=${otp}`;
    const response = await axios.get(smsUrl);

    if (response.data?.status !== "Success") {
      return res.status(500).json({
        success: false,
        message: "SMS sending failed",
        provider: response.data,
      });
    }

    // Save OTP (NO requestId)
    await OtpSession.create({
      phone,
      otpHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
      expiresIn: 120,
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "OTP send failed",
    });
  }
};

/* ================= VERIFY OTP + LOGIN ================= */
const verifyOtp = async (req, res) => {
  try {
    let { phone, otp } = req.body;
    phone = normalizePhone(phone);

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const session = await OtpSession.findOne({ phone });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired",
      });
    }

    if (session.expiresAt < new Date()) {
      await OtpSession.deleteMany({ phone });
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    session.attempts += 1;

    if (session.attempts > 5) {
      await OtpSession.deleteMany({ phone });
      return res.status(429).json({
        success: false,
        message: "Too many wrong attempts",
      });
    }

    if (session.otpHash !== hashOtp(otp)) {
      await session.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ OTP correct
    await OtpSession.deleteMany({ phone });

    // ================= USER AUTO CREATE =================
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    user.lastLogin = new Date();
    await user.save();

    // ================= ISSUE JWT =================
    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.message);
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
