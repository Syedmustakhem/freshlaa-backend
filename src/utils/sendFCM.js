const admin = require("../config/firebase");

// Channel IDs must be created in your Android app's notification setup
// Each maps to a different sound/importance level
const CHANNEL_MAP = {
  ORDER:       "orders",        // order updates — high importance
  MARKETING:   "marketing",     // offers, campaigns — default importance
  PRICE_ALERT: "price_alerts",  // price drop alerts — high importance
  DEFAULT:     "default",       // fallback
};

const sendFCM = async ({
  token,
  title,
  body,
  imageUrl = null,
  data     = {},
  type     = "DEFAULT",   // ✅ NEW: pass type to pick correct channel
}) => {

  if (!token) {
    console.log("⚠️ No FCM token provided");
    return;
  }

  console.log("📤 Sending FCM notification");
  console.log("➡️ Token :", token);
  console.log("➡️ Title :", title);
  console.log("➡️ Body  :", body);
  console.log("➡️ Image :", imageUrl);
  console.log("➡️ Data  :", JSON.stringify(data)); // ✅ FIX: now logs actual data

  // ✅ FIX: String(object) returns "[object Object]" — use JSON.stringify for objects
  // FCM requires ALL data values to be strings
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v),
    ])
  );

  // ✅ FIX: dynamic channel based on notification type
  const channelId = CHANNEL_MAP[type] ?? CHANNEL_MAP.DEFAULT;

  const message = {
    token,
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl }),
    },
    data: stringData,
    android: {
      priority: "high",
      notification: {
        sound:     "default",
        channelId,                             // ✅ dynamic, not hardcoded "orders"
        ...(imageUrl && { imageUrl }),
      },
    },
    apns: {
      payload: { aps: { sound: "default" } },
      ...(imageUrl && { fcmOptions: { imageUrl } }),
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ FCM sent:", response);
    return response;
  } catch (err) {
    console.error("❌ FCM send failed:", err.message);
    throw err;
  }
};

module.exports = sendFCM;