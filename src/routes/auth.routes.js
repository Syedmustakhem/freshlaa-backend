const express = require("express");
const router = express.Router();

const {
  sendOtp,
  resendOtp,
  verifyOtp,
  deleteAccount,
} = require("../controllers/auth.controller");

const { protect } = require("../middlewares/auth.middleware");

/* OTP */
router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

/* ACCOUNT */
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;