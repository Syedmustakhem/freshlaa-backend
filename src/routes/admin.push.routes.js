const express = require("express");
const router = express.Router();

const User = require("../models/User");
const { sendPushNotification } = require("../services/push.service");

router.post("/campaign", async (req, res) => {

  try {

    const { title, message, imageUrl } = req.body;

    const users = await User.find({
      fcmToken: { $ne: null }
    });

    for (const user of users) {

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

    }

    res.json({
      success: true,
      totalUsers: users.length
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

module.exports = router;