const admin = require("../config/firebase"); // ✅ reuses existing init

const sendFCM = async ({ token, title, body, imageUrl = null, data = {} }) => {
  if (!token) {
    console.log("⚠️ No FCM token provided");
    return;
  }

  console.log("📤 Sending FCM notification");
  console.log("➡️ Token:", token);
  console.log("➡️ Title:", title);
  console.log("➡️ Body:", body);
  console.log("➡️ Image:", imageUrl);

  // FCM requires all data values to be strings
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

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
        sound: "default",
        channelId: "orders",
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
    console.log("✅ FCM sent successfully:", response);
    return response;
  } catch (err) {
    console.error("❌ FCM send failed:", err.message);
    throw err;
  }
};

module.exports = sendFCM;