const User = require("../models/User");
const Notification = require("../models/Notification");

const sendPush = require("../utils/sendPush");      // Expo push
const sendFCM = require("../utils/sendFCM");        // Firebase push

const { sendWhatsAppTemplate } = require("./whatsapp.service");


exports.notifyUser = async ({
  userId,
  type,
  pushData,       // { title, body, data, imageUrl }
  whatsappData,
}) => {

  try {

    const user = await User.findById(userId);

    if (!user) {
      console.log("⚠️ User not found:", userId);
      return;
    }

    /* ─────────────────────────────────────────────
       PUSH NOTIFICATIONS
    ───────────────────────────────────────────── */

    if (pushData) {

      let pushStatus = "FAILED";
      let pushError = null;

      const {
        title,
        body,
        data = {},
        imageUrl = null
      } = pushData;

      /* ───────── TRY FCM FIRST ───────── */

      if (user.fcmToken) {

        try {

          await sendFCM({
            token: user.fcmToken,
            title,
            body,
            imageUrl,
            data,
          });

          pushStatus = "SENT";
          console.log("✅ FCM push sent");

        } catch (err) {

          console.log("❌ FCM failed:", err.message);
          pushError = err.message;

          /* Remove invalid token */

          if (
            err.code === "messaging/registration-token-not-registered" ||
            err.message?.includes("not registered")
          ) {
            await User.findByIdAndUpdate(userId, { fcmToken: null });
            console.log("⚠️ Invalid FCM token removed");
          }

          /* ───────── FALLBACK TO EXPO ───────── */

          if (user.expoPushToken) {

            try {

              await sendPush({
                expoPushToken: user.expoPushToken,
                title,
                body,
                data,
                imageUrl
              });

              pushStatus = "SENT";
              pushError = null;

              console.log("✅ Expo fallback push sent");

            } catch (expoErr) {

              pushError = expoErr.message;

              console.log("❌ Expo fallback failed:", expoErr.message);

            }

          }

        }

      }

      /* ───────── ONLY EXPO TOKEN AVAILABLE ───────── */

      else if (user.expoPushToken) {

        try {

          await sendPush({
            expoPushToken: user.expoPushToken,
            title,
            body,
            data,
            imageUrl
          });

          pushStatus = "SENT";
          console.log("✅ Expo push sent");

        } catch (err) {

          pushError = err.message;

          console.log("❌ Expo push failed:", err.message);

        }

      }

      /* ───────── SAVE PUSH LOG ───────── */

      await Notification.create({

        user: userId,
        type,

        channel: "PUSH",

        title,
        body,
        data,
        imageUrl,

        status: pushStatus,

        ...(pushError && { error: pushError }),

        createdAt: new Date()

      });

    }

    /* ─────────────────────────────────────────────
       WHATSAPP NOTIFICATIONS
    ───────────────────────────────────────────── */

    if (whatsappData && user.phone) {

      try {

        const phone = user.phone.replace(/\D/g, "");

        await sendWhatsAppTemplate(
          phone,
          whatsappData.template,
          whatsappData.params || []
        );

        await Notification.create({

          user: userId,
          type,

          channel: "WHATSAPP",

          template: whatsappData.template,

          status: "SENT",

          createdAt: new Date()

        });

        console.log("✅ WhatsApp sent");

      } catch (err) {

        await Notification.create({

          user: userId,
          type,

          channel: "WHATSAPP",

          template: whatsappData.template,

          status: "FAILED",

          error: err.message,

          createdAt: new Date()

        });

        console.log("❌ WhatsApp failed:", err.message);

      }

    }

  } catch (err) {

    console.log("❌ notifyUser error:", err.message);

  }

};