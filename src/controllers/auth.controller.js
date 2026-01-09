const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpSession = require("../models/OtpSession");
const generateLucentJwt = require("../utils/lucentjwt");

const OTP_URL = process.env.OTP_API_BASE_URL;

/* ================= SEND / RESEND OTP ================= */
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    await OtpSession.deleteMany({ phone });

    const lucentJwt = generateLucentJwt();

    const response = await axios.post(
      OTP_URL,
      {
        username: `+91${phone}`
      },
      {
        headers: {
          Authorization: `Bearer ${lucentJwt}`,
          shop_name: process.env.OTP_SHOP_NAME,
          action: "resendOTP",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status !== 200) {
      return res.status(400).json({
        success: false,
        message: response.data?.message || "OTP send failed",
      });
    }

    await OtpSession.create({
      phone,
      otpId: response.data.data.otpId,
    });

    res.json({
      success: true,
      otpId: response.data.data.otpId,
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "OTP send failed" });
  }
};

/* ================= VERIFY OTP (UPDATE CUSTOMER) ================= */
const verifyOtp = async (req, res) => {
  try {
    const { phone, otpId, first_name, last_name, email } = req.body;

    const session = await OtpSession.findOne({ phone, otpId });
    if (!session) {
      return res.status(400).json({ success: false, message: "OTP session not found" });
    }

    const lucentJwt = generateLucentJwt();

    const response = await axios.post(
      OTP_URL,
      {
        otp_id: otpId,
        first_name,
        last_name,
        phone_no: `+91${phone}`,
        email,
      },
      {
        headers: {
          Authorization: `Bearer ${lucentJwt}`,
          shop_name: process.env.OTP_SHOP_NAME,
          action: "updateEmail",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status !== 200) {
      return res.status(400).json({
        success: false,
        message: response.data?.message || "OTP verification failed",
      });
    }

    await OtpSession.deleteMany({ phone });

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone, email });
    }

    const appToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token: appToken,
      redirect_url: response.data.data.redirect_url,
      user,
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

/* ================= DELETE ACCOUNT ================= */
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false });

    await User.findByIdAndDelete(user._id);
    await OtpSession.deleteMany({ phone: user.phone });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  deleteAccount,
};
