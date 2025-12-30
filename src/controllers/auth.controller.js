const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");

/* ================= CONFIG ================= */

const OTP_URL = process.env.OTP_API_BASE_URL;
const OTP_API_KEY = process.env.OTP_API_KEY;
const OTP_API_SECRET = process.env.OTP_API_SECRET;
const OTP_SHOP_NAME = process.env.OTP_SHOP_NAME;

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

/* ================= LUCENT JWT ================= */
const generateLucentJwt = () => {
  return jwt.sign(
    {
      iss: OTP_API_KEY,
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 mins
    },
    OTP_API_SECRET,
    { algorithm: "HS256" }
  );
};

const otpHeaders = () => ({
  Authorization: `Bearer ${generateLucentJwt()}`,
  shop_name: OTP_SHOP_NAME,
  "Content-Type": "application/json",
});

/* ================= SEND OTP ================= */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    // clear old sessions
    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      { headers: { ...otpHeaders(), action: "sendOTP" } }
    );

    await OtpSession.create({
      phone,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    res.json({ success: true, message: "OTP sent", expiresIn: 120 });
  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP send failed" });
  }
};

/* ================= RESEND OTP ================= */
exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      { headers: { ...otpHeaders(), action: "sendOTP" } }
    );

    await OtpSession.create({
      phone,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    res.json({ success: true, message: "OTP resent", expiresIn: 120 });
  } catch (err) {
    console.error("RESEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP resend failed" });
  }
};

/* ================= VERIFY OTP ================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const session = await OtpSession.findOne({ phone });
    if (!session || session.expiresAt < new Date()) {
      await OtpSession.deleteMany({ phone });
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const response = await axios.post(
      OTP_URL,
      { username: `+91${phone}`, otp, type: "phone" },
      { headers: { ...otpHeaders(), action: "verifyOTP" } }
    );

    if (response.data.status !== 200) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await OtpSession.deleteMany({ phone });

    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ success: true, token, user });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP verify failed" });
  }
};

/* ================= CLEAR OTP SESSIONS ================= */
exports.clearOtpSessions = async (req, res) => {
  await OtpSession.deleteMany({ phone: req.body.phone });
  res.json({ success: true, message: "OTP sessions cleared" });
};

/* ================= DELETE ACCOUNT ================= */
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await OtpSession.deleteMany({ phone: user.phone });
    await User.findByIdAndDelete(req.user.id);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err.message);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};