const express = require("express");
const router = express.Router();

const { Expo } = require("expo-server-sdk");
const User = require("../models/User");
const Notification = require("../models/Notification");

const expo = new Expo();

/* =====================================
SEND PUSH CAMPAIGN TO ALL APP USERS
===================================== */

router.post("/campaign", async (req, res) => {
  try {
    const { title, message, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message required",
      });
    }

    const users = await User.find({
      expoPushToken: { $ne: null },
      isBlocked: false,
    }).select("_id expoPushToken");

    const messages = [];

    for (const user of users) {
      if (!Expo.isExpoPushToken(user.expoPushToken)) continue;

      messages.push({
        to: user.expoPushToken,
        sound: "default",
        title: title,
        body: message,
        data: data || {},
      });

      await Notification.create({
        user: user._id,
        type: "MARKETING",
        channel: "PUSH",
        template: "CAMPAIGN",
        payload: { title, message },
        status: "SENT",
      });
    }

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    res.json({
      success: true,
      totalUsers: users.length,
      sent: messages.length,
    });
  } catch (err) {
    console.error("Push Campaign Error:", err);

    res.status(500).json({
      success: false,
      message: "Campaign failed",
    });
  }
});

module.exports = router;