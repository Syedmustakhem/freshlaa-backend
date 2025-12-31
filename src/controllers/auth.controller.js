const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");

/* CONFIG */
const OTP_URL = process.env.OTP_API_BASE_URL;

const OTP_HEADERS = {
  Authorization: process.env.OTP_API_TOKEN, // NO "Bearer"
  shop_name: process.env.OTP_SHOP_NAME,
  "Content-Type": "application/json",
};

const OTP_EXPIRY_MS = 2 * 60 * 1000;

/* SEND OTP */
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      { headers: { ...OTP_HEADERS, action: "sendOTP" } }
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

/* RESEND OTP */
const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      { headers: { ...OTP_HEADERS, action: "sendOTP" } }
    );

    await OtpSession.create({
      phone,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    res.json({ success: true, expiresIn: 120 });
  } catch (err) {
    console.error("RESEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "Resend failed" });
  }
};

/* VERIFY OTP */
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const session = await OtpSession.findOne({ phone });
    if (!session || session.expiresAt < new Date()) {
      await OtpSession.deleteMany({ phone });
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const response = await axios.post(
      OTP_URL,
      { username: `+91${phone}`, otp, type: "phone" },
      { headers: { ...OTP_HEADERS, action: "verifyOTP" } }
    );

    if (response.data.status !== 200) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await OtpSession.deleteMany({ phone });

    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({ success: true, token, user });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "Verify failed" });
  }
};

/* DELETE ACCOUNT */
const deleteAccount = async (req, res) => {
  try {
    const user = req.user;

    await User.findByIdAndDelete(user._id);
    await OtpSession.deleteMany({ phone: user.phone });

    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

module.exports = {
  sendOtp,
  resendOtp,
  verifyOtp,
  deleteAccount,
};