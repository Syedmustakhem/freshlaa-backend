const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendPushNotification } = require("../services/push.service");

/* =====================================
SEND PUSH CAMPAIGN TO ALL APP USERS
===================================== */

router.post("/campaign", async (req, res) => {

  try {

    const { title, message, imageUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message required"
      });
    }

    const users = await User.find({
      fcmToken: { $exists: true, $ne: null, $ne: "" },
      isBlocked: false
    }).select("_id fcmToken");

    await Promise.all(
      users.map(async (user) => {

        await sendPushNotification(
          user.fcmToken,
          title,
          message,
          imageUrl,
          {
            screen: "campaign",
            banner: imageUrl
          }
        );

        await Notification.create({
          user: user._id,
          type: "MARKETING",
          channel: "PUSH",
          template: "CAMPAIGN",
          payload: { title, message },
          status: "SENT",
        });

      })
    );

    res.json({
      success: true,
      totalUsers: users.length
    });

  } catch (err) {

    console.error("Push Campaign Error:", err);

    res.status(500).json({
      success: false
    });

  }

});

module.exports = router;