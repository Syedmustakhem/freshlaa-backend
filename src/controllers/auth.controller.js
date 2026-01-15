const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const Otp = require("../models/Otp");
const User = require("../models/User");

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 min

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

/* ================= SEND / RESEND OTP ================= */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    // 📩 SEND SMS
    const smsUrl = `https://apihome.in/panel/api/bulksms/?key=${process.env.SMS_API_KEY}&mobile=${phone}&otp=${otp}`;
    const response = await axios.get(smsUrl);

    if (response.data?.status !== "Success") {
      return res.status(500).json({
        success: false,
        message: "SMS sending failed",
      });
    }

    // ✅ UPSERT OTP (FIXES ALL ISSUES)
    await Otp.findOneAndUpdate(
      { phone },
      {
        phone,
        otpHash,
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      { upsert: true }
    );

    return res.json({
      success: true,
      message: "OTP sent successfully",
      expiresIn: 120,
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "OTP send failed",
    });
  }
};

/* ================= VERIFY OTP ================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone & OTP required",
      });
    }

    const session = await Otp.findOne({ phone });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (session.expiresAt < new Date()) {
      await Otp.deleteOne({ phone });
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    session.attempts += 1;

    if (session.attempts > 5) {
      await Otp.deleteOne({ phone });
      return res.status(429).json({
        success: false,
        message: "Too many attempts",
      });
    }

    if (session.otpHash !== hashOtp(String(otp))) {
      await session.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ OTP SUCCESS
    await Otp.deleteOne({ phone });

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
