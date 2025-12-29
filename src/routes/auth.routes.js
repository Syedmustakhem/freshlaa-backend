import express from "express";
import {
  sendOtp,
  verifyOtp,
  deleteAccount,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ---------- OTP AUTH ---------- */

// Send OTP
router.post("/send-otp", sendOtp);

// Verify OTP + Login/Register
router.post("/verify-otp", verifyOtp);

/* ---------- ACCOUNT ---------- */

// Delete account (JWT required)
router.post("/delete-account", protect, deleteAccount);

export default router;