const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");
const generateLucentJwt = require("../utils/lucentJwt");

const OTP_URL = process.env.OTP_API_BASE_URL;
const OTP_EXPIRY_MS = 2 * 60 * 1000;

/* ================= SEND OTP ================= */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    await OtpSession.deleteMany({ phone });

    const lucentJwt = generateLucentJwt();

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      {
        headers: {
          Authorization: `key=${process.env.OTP_API_KEY}`,
          "X-Auth-Token": lucentJwt,
          shop_name: process.env.OTP_SHOP_NAME,
          action: "sendOTP",
          "Content-Type": "application/json",
        },
      }
    );

    await OtpSession.create({
      phone,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    res.json({ success: true, expiresIn: 120 });
  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP send failed" });
  }
};

/* ================= VERIFY OTP ================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const session = await OtpSession.findOne({ phone });
    if (!session || session.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const lucentJwt = generateLucentJwt();

    const response = await axios.post(
      OTP_URL,
      { username: `+91${phone}`, otp, type: "phone" },
      {
        headers: {
          Authorization: `key=${process.env.OTP_API_KEY}`,
          "X-Auth-Token": lucentJwt,
          shop_name: process.env.OTP_SHOP_NAME,
          action: "verifyOTP",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status !== 200) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await OtpSession.deleteMany({ phone });

    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone });

    const appToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ success: true, token: appToken, user });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP verify failed" });
  }
};

/* ================= DELETE ACCOUNT ================= */
/*
🔐 Requires JWT (Authorization: Bearer <appToken>)
Play Store compliant:
- Deletes user
- Deletes OTP sessions
- No silent data retention
*/
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🧹 Cleanup
    await OtpSession.deleteMany({ phone: user.phone });
    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Account deletion failed",
    });
  }
};