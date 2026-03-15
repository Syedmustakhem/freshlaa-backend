const express    = require("express");
const router     = express.Router();
const User       = require("../models/User");
const GuestToken = require("../models/GuestToken"); // ✅ NEW: save guest tokens
const notificationController = require("../controllers/notification.controller");

/* ─────────────────────────────────────────────
   SAVE PUSH TOKENS (Expo + FCM)
   Called by app on launch for both logged-in users and guests
───────────────────────────────────────────── */
router.post("/save-push-token", async (req, res) => {
  try {
    const { expoPushToken, fcmToken, userId, device } = req.body;

    if (!expoPushToken && !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "No push tokens provided",
      });
    }

    if (userId) {
      // ✅ Logged-in user — save tokens against their account
      await User.findByIdAndUpdate(userId, {
        ...(expoPushToken && { expoPushToken }),
        ...(fcmToken      && { fcmToken }),
        ...(device        && { pushDevice: device }),
      });

      console.log("✅ Tokens saved for user:", userId);
      console.log("   Expo:", expoPushToken);
      console.log("   FCM :", fcmToken);

    } else {
      // ✅ FIX: Guest tokens are now saved — previously just logged and lost.
      // This allows sending push to guests (promo, restock alerts, etc.)
      await GuestToken.findOneAndUpdate(
        { $or: [{ expoPushToken }, { fcmToken }] },
        {
          ...(expoPushToken && { expoPushToken }),
          ...(fcmToken      && { fcmToken }),
          ...(device        && { device }),
          lastSeen: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log("👤 Guest token saved");
      console.log("   Expo:", expoPushToken);
      console.log("   FCM :", fcmToken);
    }

    res.json({ success: true, message: "Push tokens saved" });

  } catch (err) {
    console.error("❌ Token save error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   TEST PUSH  (dev/admin use)
   POST /api/notifications/test-push
   Body: { pushToken, fcmToken, title, body, screen, screenParams }
   Screens: OrderTracking | ProductDetails | OffersScreen | CategoryProducts | Campaign
───────────────────────────────────────────── */
router.post("/test-push", notificationController.sendTestPush); // ✅ NEW

module.exports = router;