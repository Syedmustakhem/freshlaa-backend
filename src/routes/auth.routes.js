const express = require("express");
const router = express.Router();

const {
  sendOtp,
  resendOtp,
  verifyOtp,
  deleteAccount,
} = require("../controllers/auth.controller");

const protect = require("../middlewares/auth.middleware");

/* ================= OTP AUTH ================= */

// Send OTP
router.post("/send-otp", sendOtp);

// Resend OTP
router.post("/resend-otp", resendOtp);

// Verify OTP (login / register)
router.post("/verify-otp", verifyOtp);

/* ================= ACCOUNT ================= */

// Delete account (JWT required)
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;