const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");

/* ================== CONFIG ================== */

const OTP_URL = process.env.OTP_API_BASE_URL;
// https://sotp-api.lucentinnovation.com/v6/otp
const OTP_HEADERS = {
  Authorization: process.env.OTP_API_TOKEN, // ✅ NO Bearer
  shop_name: process.env.OTP_SHOP_NAME,     // freshlaa
  "Content-Type": "application/json",
};
const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

/* ================== SEND OTP ================== */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // 🔥 Clear old OTPs
    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      {
        username: `+91${phone}`,
        type: "phone",
      },
      {
        headers: {
          ...OTP_HEADERS,
          action: "sendOTP",
        },
      }
    );

    await OtpSession.create({
      phone,
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
      message: "Failed to send OTP",
    });
  }
};

/* ================== RESEND OTP ================== */
exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    await OtpSession.deleteMany({ phone });

    await axios.post(
      OTP_URL,
      {
        username: `+91${phone}`,
        type: "phone",
      },
      {
        headers: {
          ...OTP_HEADERS,
          action: "sendOTP",
        },
      }
    );

    await OtpSession.create({
      phone,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    return res.json({
      success: true,
      message: "OTP resent successfully",
      expiresIn: 120,
    });
  } catch (err) {
    console.error("RESEND OTP ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

/* ================== VERIFY OTP ================== */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone and OTP required",
      });
    }

    const session = await OtpSession.findOne({ phone });

    if (!session || session.expiresAt < new Date()) {
      await OtpSession.deleteMany({ phone });
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const response = await axios.post(
      OTP_URL,
      {
        username: `+91${phone}`,
        otp,
        type: "phone",
      },
      {
        headers: {
          ...OTP_HEADERS,
          action: "verifyOTP",
        },
      }
    );

    if (response.data.status !== 200) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // 🔥 OTP verified → cleanup
    await OtpSession.deleteMany({ phone });

    // 👤 Create or update user
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        lastLogin: new Date(),
      });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    // 🔑 JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

/* ================== DELETE ACCOUNT ================== */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.findByIdAndDelete(userId);
    await OtpSession.deleteMany({ phone: user.phone });

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