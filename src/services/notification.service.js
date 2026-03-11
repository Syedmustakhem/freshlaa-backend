const User = require("../models/User");
const Notification = require("../models/Notification");
const sendPush = require("../utils/sendPush");         // existing Expo
const sendFCM = require("../utils/sendFCM");           // new FCM
const { sendWhatsAppTemplate } = require("./whatsapp.service");

exports.notifyUser = async ({
  userId,
  type,
  pushData,       // { title, body, data, imageUrl }
  whatsappData,
}) => {
  const user = await User.findById(userId);
  if (!user) return;

  // ─── PUSH ───────────────────────────────────────────
  if (pushData) {
    let pushStatus = "FAILED";
    let pushError  = null;

    // ✅ Try FCM first (rich banners, images)
    if (user.fcmToken) {
      try {
        await sendFCM({
          token:    user.fcmToken,
          title:    pushData.title,
          body:     pushData.body,
          imageUrl: pushData.imageUrl || null,
          data:     pushData.data    || {},
        });
        pushStatus = "SENT";
        console.log("✅ FCM push sent");
      } catch (err) {
        console.log("❌ FCM failed, trying Expo:", err.message);
        pushError = err.message;

        // Fallback to Expo if FCM fails
        if (user.expoPushToken) {
          try {
            await sendPush({
              expoPushToken: user.expoPushToken,
              ...pushData,
            });
            pushStatus = "SENT";
            pushError  = null;
            console.log("✅ Expo fallback push sent");
          } catch (expoErr) {
            pushError = expoErr.message;
            console.log("❌ Expo fallback also failed:", expoErr.message);
          }
        }
      }
    }
    // Fallback — only Expo token available
    else if (user.expoPushToken) {
      try {
        await sendPush({
          expoPushToken: user.expoPushToken,
          ...pushData,
        });
        pushStatus = "SENT";
        console.log("✅ Expo push sent");
      } catch (err) {
        pushError = err.message;
        console.log("❌ Expo push failed:", err.message);
      }
    }

    // Log to DB
    await Notification.create({
      user:    userId,
      type,
      channel: "PUSH",
      payload: pushData,
      status:  pushStatus,
      ...(pushError && { error: pushError }),
    });
  }

  // ─── WHATSAPP ────────────────────────────────────────
  if (whatsappData && user.phone) {
    try {
      await sendWhatsAppTemplate(
        user.phone.replace("+", ""),
        whatsappData.template,
        whatsappData.params || []
      );

      await Notification.create({
        user:     userId,
        type,
        channel:  "WHATSAPP",
        template: whatsappData.template,
        status:   "SENT",
      });
    } catch (err) {
      await Notification.create({
        user:     userId,
        type,
        channel:  "WHATSAPP",
        template: whatsappData.template,
        status:   "FAILED",
        error:    err.message,
      });
    }
  }
};