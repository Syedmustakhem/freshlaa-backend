const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");

/* ================= CONFIG ================= */

const OTP_URL = process.env.OTP_API_BASE_URL;
const OTP_EXPIRY_MS = 2 * 60 * 1000;

/* ✅ CORRECT JWT GENERATOR (FIX FROM LUCENT) */
const generateLucentJwt = () => {
  return jwt.sign(
    {
      iss: process.env.OTP_API_KEY,
      exp: Math.floor(Date.now() / 1000) + 10 * 60,
    },
    Buffer.from(process.env.OTP_API_SECRET, "base64"),
    { algorithm: "HS256" }
  );
};

const getOtpHeaders = () => ({
  Authorization: `Bearer ${generateLucentJwt()}`,
  shop_name: process.env.OTP_SHOP_NAME,
  "Content-Type": "application/json",
});

/* ================= SEND OTP ================= */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      { headers: { ...getOtpHeaders(), action: "sendOTP" } }
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

/* ================= RESEND OTP ================= */
exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      { headers: { ...getOtpHeaders(), action: "sendOTP" } }
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

/* ================= VERIFY OTP ================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const session = await OtpSession.findOne({ phone });
    if (!session || session.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const response = await axios.post(
      OTP_URL,
      { username: `+91${phone}`, otp, type: "phone" },
      { headers: { ...getOtpHeaders(), action: "verifyOTP" } }
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
    res.status(500).json({ success: false, message: "Verify failed" });
  }
};

/* ================= DELETE ACCOUNT ================= */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false });

    await User.findByIdAndDelete(userId);
    await OtpSession.deleteMany({ phone: user.phone });

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};