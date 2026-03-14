const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const User = require("../models/User");

/* SAVE PUSH TOKENS (Expo + FCM) */
router.post("/save-push-token", async (req, res) => {
  try {

    const { token, userId, device } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Push token required"
      });
    }

    if (userId) {
      // Logged-in user → save in user table
      await User.findByIdAndUpdate(userId, {
        expoPushToken: token
      });

      console.log("✅ Token saved for user:", userId);

    } else {

      console.log("👤 Guest push token saved:", token);

      // optional: save in guest_tokens collection
    }

    res.json({
      success: true,
      message: "Token saved"
    });

  } catch (err) {

    console.error("❌ Token save error:", err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
});

module.exports = router;