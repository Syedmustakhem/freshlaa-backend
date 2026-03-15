const axios = require("axios");

// ✅ FIX: Added imageUrl to Expo payload (was missing before)
const sendPush = async ({ expoPushToken, title, body, data = {}, imageUrl = null }) => {
  if (!expoPushToken) {
    console.log("⚠️ No expoPushToken provided");
    return;
  }

  console.log("📤 Sending Expo push");
  console.log("➡️ Token:", expoPushToken);
  console.log("➡️ Title:", title);
  console.log("➡️ Body:", body);
  console.log("➡️ Data:", JSON.stringify(data));

  const payload = {
    to:       expoPushToken,
    sound:    "default",
    title,
    body,
    data,
    priority: "high",
    ...(imageUrl && { richContent: { image: imageUrl } }),
  };

  try {
    const res = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );
    console.log("✅ Expo push response:", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Expo push failed:", err.response?.data || err.message);
    throw err;
  }
};

module.exports = sendPush;