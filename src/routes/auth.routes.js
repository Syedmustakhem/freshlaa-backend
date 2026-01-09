const express = require("express");
const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  deleteAccount,
} = require("../controllers/auth.controller");

const protect = require("../middlewares/auth.middleware");

/**
 * SEND / RESEND OTP
 */
router.post("/send-otp", sendOtp);

/**
 * VERIFY OTP (Update customer details)
 */
router.post("/verify-otp", verifyOtp);

/**
 * DELETE ACCOUNT
 */
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;
