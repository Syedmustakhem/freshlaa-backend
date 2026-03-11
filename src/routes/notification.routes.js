const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const User = require("../models/User");

/* SAVE PUSH TOKENS (Expo + FCM) */
router.post("/save-push-token", protect, async (req, res) => {
  try {
    const { expoPushToken, fcmToken } = req.body;

    // At least one token must be provided
    if (!expoPushToken && !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "At least one token required",
      });
    }

    // Only update fields that are provided
    const update = {};
    if (expoPushToken) update.expoPushToken = expoPushToken;
    if (fcmToken) update.fcmToken = fcmToken;

    await User.findByIdAndUpdate(req.user._id, update);

    console.log(`✅ Tokens saved for user ${req.user._id}:`, update);

    res.json({
      success: true,
      message: "Tokens saved successfully",
    });
  } catch (err) {
    console.error("❌ Token save error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to save tokens",
    });
  }
});

module.exports = router;