const express = require("express");
const router = express.Router();

const {
  sendOtp,
  resendOtp,
  verifyOtp,
  deleteAccount,
} = require("../controllers/auth.controller");

const protect = require("../middlewares/auth.middleware");

router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;
