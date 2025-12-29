import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OtpSession from "../models/OtpSession.js";
/* ---------------- CONFIG ---------------- */

const OTP_HEADERS = {
  Authorization: `Bearer ${process.env.OTP_API_KEY}`,
  "Content-Type": "application/json",
};

// 🔒 Always store phone as +91XXXXXXXXXX
const normalizePhone = (phone) => {
  if (!phone) return null;
  if (phone.startsWith("+91")) return phone;
  return `+91${phone}`;
};

/* ---------------- SEND OTP ---------------- */
export const sendOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    phone = normalizePhone(phone);

    // 🇮🇳 India validation
    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // 🔥 Clear old OTP sessions
    await OtpSession.deleteMany({ phone });

    // 📡 Provider API
    const response = await axios.post(
      `${process.env.OTP_API_BASE_URL}/send-otp`,
      {
        mobile: phone.slice(3), // remove +91
        countryCode: "91",
      },
      { headers: OTP_HEADERS }
    );

    const { requestId, expiresIn } = response.data;

    // 🔐 Save OTP session
    await OtpSession.create({
      phone,
      requestId,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      verified: false,
    });

    return res.json({
      success: true,
      requestId,
      expiresIn,
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

/* ---------------- VERIFY OTP ---------------- */
export const verifyOtp = async (req, res) => {
  try {
    let { phone, otp, requestId } = req.body;
    phone = normalizePhone(phone);

    if (!phone || !otp || !requestId) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const session = await OtpSession.findOne({
      phone,
      requestId,
      verified: false,
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "OTP session not found",
      });
    }

    if (session.expiresAt < new Date()) {
      await session.deleteOne();
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // 📡 Verify with provider
    const response = await axios.post(
      `${process.env.OTP_API_BASE_URL}/verify-otp`,
      {
        mobile: phone.slice(3),
        otp,
        requestId,
      },
      { headers: OTP_HEADERS }
    );

    if (response.data.status !== "verified") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // 🔥 OTP used → remove all sessions
    await OtpSession.deleteMany({ phone });

    // 👤 Find or create user
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
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "30d",
      }
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

/* ---------------- DELETE ACCOUNT ---------------- */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🗑️ Delete user
    await User.deleteOne({ _id: userId });

    return res.json({
      success: true,
      message: "Account deleted permanently",
    });

  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};