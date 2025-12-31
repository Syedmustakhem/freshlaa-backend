const express = require("express");
const router = express.Router();

const {
  sendOtp,
  resendOtp,
  verifyOtp,
  deleteAccount,
  updateCustomerDetails,
} = require("../controllers/auth.controller");

const protect = require("../middlewares/auth.middleware"); // ✅ FIX

router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.delete("/delete-account", protect, deleteAccount);
router.post("/update-customer", updateCustomerDetails);

module.exports = router;