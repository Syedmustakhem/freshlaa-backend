const express = require("express");

const {
  sendOtp,
  verifyOtp,
  deleteAccount,
} = require("../controllers/auth.controller");

const protect = require("../middlewares/auth.middleware");

const router = express.Router();

/* ---------- OTP AUTH ---------- */
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

/* ---------- ACCOUNT ---------- */
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;