const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");

/* ================= LUCENT JWT ================= */
const generateLucentJwt = () => {
  return jwt.sign(
    {
      iss: process.env.OTP_API_KEY,
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 mins
    },
    Buffer.from(process.env.OTP_API_SECRET, "base64"),
    { algorithm: "HS256" }
  );
};

/* ================= CONFIG ================= */
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
      process.env.OTP_API_BASE_URL,
      {
        username: `+91${phone}`,
        type: "phone",
      },
      {
        headers: {
          Authorization: process.env.OTP_API_KEY, // ✅ API KEY ONLY
          "X-Auth-Token": lucentJwt,               // ✅ JWT HERE
          shop_name: process.env.OTP_SHOP_NAME,
          action: "sendOTP",
          "Content-Type": "application/json",
        },
      }
    );

    await OtpSession.create({
      phone,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    res.json({ success: true, expiresIn: 120 });
  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP send failed" });
  }
};

/* ================= RESEND OTP ================= */
const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      { username: `+91${phone}`, type: "phone" },
      {
        headers: {
          Authorization: `key=${process.env.OTP_API_KEY}`,
          "X-Auth-Token": generateLucentJwt(),
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

    const lucentJwt = generateLucentJwt();

    const response = await axios.post(
      process.env.OTP_API_BASE_URL,
      {
        username: `+91${phone}`,
        otp,
        type: "phone",
      },
      {
        headers: {
          Authorization: process.env.OTP_API_KEY, // ✅ API KEY
          "X-Auth-Token": lucentJwt,               // ✅ JWT
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

/* ================= UPDATE CUSTOMER ================= */
const updateCustomerDetails = async (req, res) => {
  try {
    const { phone, email, name } = req.body;

    const response = await axios.post(
      OTP_URL,
      { username: `+91${phone}`, phone, email, name, type: "phone" },
      {
        headers: {
          Authorization: `key=${process.env.OTP_API_KEY}`,
          "X-Auth-Token": generateLucentJwt(),
          shop_name: process.env.OTP_SHOP_NAME,
          action: "updateCustomer",
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true, redirect_url: response.data.redirect_url });
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
};

/* ================= DELETE ACCOUNT ================= */
const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    await OtpSession.deleteMany({ phone: req.user.phone });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ================= EXPORTS ================= */
module.exports = {
  sendOtp,
  resendOtp,
  verifyOtp,
  updateCustomerDetails,
  deleteAccount,
};