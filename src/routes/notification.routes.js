const express = require("express");
const router = express.Router();
const User = require("../models/User");

/* SAVE PUSH TOKENS (Expo + FCM) */

router.post("/save-push-token", async (req, res) => {
  try {

    const { expoPushToken, fcmToken, userId, device } = req.body;

    if (!expoPushToken && !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "No push tokens provided"
      });
    }

    if (userId) {

      await User.findByIdAndUpdate(userId, {
        ...(expoPushToken && { expoPushToken }),
        ...(fcmToken && { fcmToken }),
        ...(device && { pushDevice: device })
      });

      console.log("✅ Tokens saved for user:", userId);
      console.log("Expo:", expoPushToken);
      console.log("FCM:", fcmToken);

    } else {

      console.log("👤 Guest tokens received:");
      console.log("Expo:", expoPushToken);
      console.log("FCM:", fcmToken);

      // optional: store guest tokens in separate collection

    }

    res.json({
      success: true,
      message: "Push tokens saved"
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