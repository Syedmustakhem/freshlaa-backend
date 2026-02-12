const User = require("../models/User");
const Notification = require("../models/Notification");
const sendPush = require("../utils/sendPush");
const { sendWhatsAppTemplate } = require("./whatsapp.service");

exports.notifyUser = async ({
  userId,
  type,
  pushData,
  whatsappData,
}) => {
  const user = await User.findById(userId);
  if (!user) return;

  // PUSH
  if (pushData && user.expoPushToken) {
    try {
      await sendPush({
        expoPushToken: user.expoPushToken,
        ...pushData,
      });

      await Notification.create({
        user: userId,
        type,
        channel: "PUSH",
        payload: pushData,
        status: "SENT",
      });
    } catch (err) {
      await Notification.create({
        user: userId,
        type,
        channel: "PUSH",
        status: "FAILED",
        error: err.message,
      });
    }
  }

  // WHATSAPP
  if (whatsappData && user.phone) {
    try {
      await sendWhatsAppTemplate(
        user.phone.replace("+", ""),
        whatsappData.template,
        whatsappData.params || []
      );

      await Notification.create({
        user: userId,
        type,
        channel: "WHATSAPP",
        template: whatsappData.template,
        status: "SENT",
      });
    } catch (err) {
      await Notification.create({
        user: userId,
        type,
        channel: "WHATSAPP",
        template: whatsappData.template,
        status: "FAILED",
        error: err.message,
      });
    }
  }
};
