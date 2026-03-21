const express    = require("express");
const router     = express.Router();
const User       = require("../models/User");
const GuestToken = require("../models/GuestToken");
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
      await User.findByIdAndUpdate(userId, {
        ...(expoPushToken && { expoPushToken }),
        ...(fcmToken      && { fcmToken }),
        ...(device        && { pushDevice: device }),
      });

      console.log("✅ Tokens saved for user:", userId);
      console.log("   Expo:", expoPushToken);
      console.log("   FCM :", fcmToken);

    } else {
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
───────────────────────────────────────────── */
router.post("/test-push", notificationController.sendTestPush);


/* ═════════════════════════════════════════════
   BANNER NOTIFICATIONS (Socket.io broadcast)
   Uses global.io from server.js
═════════════════════════════════════════════ */

const BANNER_CONFIGS = {
  rain: {
    icon: "🌧️",
    title: "Heavy rain in your area",
    subtitle: "Delivery may take a few extra minutes",
    color: "#1565c0",
    duration: 4000,
  },
  demand: {
    icon: "🔥",
    title: "High demand right now",
    subtitle: "Some orders may take slightly longer",
    color: "#b71c1c",
    duration: 3500,
  },
  offer: {
    icon: "🎉",
    title: "Free delivery right now!",
    subtitle: "₹0 handling · ₹0 delivery · ₹0 surge",
    color: "#1b5e20",
    duration: 3000,
  },
  custom: {
    icon: "📢",
    title: "",
    subtitle: "",
    color: "#6a1b9a",
    duration: 4000,
  },
};

/* ─────────────────────────────────────────────
   GET /api/notifications/banner-types
   Returns all types — used by admin dashboard
───────────────────────────────────────────── */
router.get("/banner-types", (req, res) => {
  const types = Object.entries(BANNER_CONFIGS).map(([key, val]) => ({
    id:       key,
    icon:     val.icon,
    title:    val.title || "(custom)",
    color:    val.color,
    duration: val.duration,
  }));
  res.json({ success: true, types });
});

/* ─────────────────────────────────────────────
   GET /api/notifications/banner-status
   Returns how many clients are connected
───────────────────────────────────────────── */
router.get("/banner-status", (req, res) => {
  const count = global.io?.engine?.clientsCount ?? 0;
  res.json({
    success: true,
    connectedClients: count,
    timestamp: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────
   POST /api/notifications/broadcast
   Body: {
     type: "rain" | "demand" | "offer" | "custom",
     title?:    string,
     subtitle?: string,
     color?:    string,
     duration?: number,
     icon?:     string,
   }
───────────────────────────────────────────── */
router.post("/broadcast", (req, res) => {
  const { type, title, subtitle, color, duration, icon } = req.body;

  if (!type) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: type",
      validTypes: Object.keys(BANNER_CONFIGS),
    });
  }

  if (!BANNER_CONFIGS[type]) {
    return res.status(400).json({
      success: false,
      error: `Unknown type "${type}"`,
      validTypes: Object.keys(BANNER_CONFIGS),
    });
  }

  if (!global.io) {
    return res.status(500).json({
      success: false,
      error: "Socket.io not ready",
    });
  }

  // Merge defaults with any overrides from request body
  const payload = {
    event:    "SHOW_BANNER",
    type,
    ...BANNER_CONFIGS[type],
    ...(title    && { title }),
    ...(subtitle && { subtitle }),
    ...(color    && { color }),
    ...(duration && { duration: Number(duration) }),
    ...(icon     && { icon }),
    sentAt: new Date().toISOString(),
  };

  // ✅ Broadcast to every connected socket.io client
  global.io.emit("SHOW_BANNER", payload);

  const count = global.io.engine.clientsCount;
  console.log(`[Banner] "${type}" broadcast to ${count} clients`);

  return res.json({
    success: true,
    message: `Banner "${type}" sent to ${count} connected users`,
    connectedClients: count,
    payload,
  });
});

module.exports = router;