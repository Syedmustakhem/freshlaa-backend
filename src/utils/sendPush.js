const axios = require("axios");

const sendPush = async ({ expoPushToken, title, body, data = {} }) => {
  if (!expoPushToken) return;

  try {
    await axios.post("https://exp.host/--/api/v2/push/send", {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    });
  } catch (err) {
    console.log("❌ Push send failed:", err.message);
  }
};

module.exports = sendPush;
