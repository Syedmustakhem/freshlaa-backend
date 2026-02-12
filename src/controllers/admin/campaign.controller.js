const User = require("../../models/User");
const { notifyUser } = require("../../services/notification.service");

exports.sendCampaign = async (req, res) => {
  try {
    const { title, message, whatsappTemplate } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message required",
      });
    }

    const users = await User.find({ isBlocked: false }).select("_id");

    for (const user of users) {
      await notifyUser({
        userId: user._id,
        type: "MARKETING",
        pushData: {
          title,
          body: message,
        },
        whatsappData: whatsappTemplate
          ? {
              template: whatsappTemplate,
              params: [],
            }
          : null,
      });
    }

    res.json({
      success: true,
      message: "Campaign sent successfully",
    });

  } catch (err) {
    console.error("CAMPAIGN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Campaign failed",
    });
  }
};
