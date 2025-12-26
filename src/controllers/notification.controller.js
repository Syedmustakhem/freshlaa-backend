const fetch = require("node-fetch");

/* 🔔 SEND PUSH NOTIFICATION */
exports.sendTestPush = async (req, res) => {
  try {
    const { pushToken, title, body } = req.body;

    if (!pushToken) {
      return res.status(400).json({ message: "Push token missing" });
    }

    const message = {
      to: pushToken,
      sound: "default",
      title: title || "Freshlaa 🛒",
      body: body || "This is a test notification 🚀",
      data: { screen: "Home" },
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    res.json({
      success: true,
      expoResponse: result,
    });
  } catch (err) {
    console.error("Push error:", err);
    res.status(500).json({ message: "Push failed" });
  }
};