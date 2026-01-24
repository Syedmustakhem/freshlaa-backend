const axios = require("axios");

const sendPush = async ({ expoPushToken, title, body, data = {} }) => {
  if (!expoPushToken) {
    console.log("⚠️ No expoPushToken provided");
    return;
  }

  console.log("📤 Sending push notification");
  console.log("➡️ Token:", expoPushToken);
  console.log("➡️ Title:", title);
  console.log("➡️ Body:", body);

  try {
    const res = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("✅ Expo push response:", res.data);
  } catch (err) {
    console.error(
      "❌ Expo push failed:",
      err.response?.data || err.message
    );
  }
};

module.exports = sendPush;
