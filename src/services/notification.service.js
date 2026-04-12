const User         = require("../models/User");
const Notification = require("../models/Notification");
const sendPush     = require("../utils/sendPush");
const sendFCM      = require("../utils/sendFCM");
const { sendWhatsAppTemplate } = require("./whatsapp.service");

/* ─────────────────────────────────────────────────────────────────────────────
   DEEP LINK DATA BUILDER
   Builds the correct `data` object for each notification type.
   This is what tells the app which screen to open when user taps the notification.

   Usage:
     buildDeepLinkData("ORDER_TRACKING",    { orderId: "453C1B" })
     buildDeepLinkData("PRODUCT",           { productId: "abc123" })
     buildDeepLinkData("OFFER",             { offerId: "SUMMER20" })
     buildDeepLinkData("CATEGORY",          { categoryId: "snacks", categoryName: "Snacks" })
     buildDeepLinkData("CAMPAIGN",          { banner: { title: "...", imageUrl: "..." } })
───────────────────────────────────────────────────────────────────────────── */
function buildDeepLinkData(type, params = {}) {
  switch (type) {

    case "ORDER_TRACKING":
      return {
        screen:  "OrderTracking",
        orderId: String(params.orderId ?? ""),
      };

    case "PRODUCT":
      return {
        screen:    "ProductDetails",
        productId: String(params.productId ?? ""),
      };

    case "OFFER":
      return {
        screen:  "OffersScreen",
        offerId: String(params.offerId ?? ""),
      };

    case "CATEGORY":
      return {
        screen:       "CategoryProducts",
        categoryId:   String(params.categoryId ?? ""),
        categoryName: String(params.categoryName ?? ""),
      };

    case "CAMPAIGN":
      // banner can be an object — JSON-encode for FCM (FCM requires string values)
      return {
        screen: "Campaign",
        banner: typeof params.banner === "string"
          ? params.banner
          : JSON.stringify(params.banner ?? {}),
      };

    default:
      // Generic — caller passed a pre-built data object
      return params;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN NOTIFY FUNCTION
   Call this from anywhere in your backend to send a push + optional WhatsApp.

   Examples:

   // Order out for delivery
   await notifyUser({
     userId: order.user,
     type: "ORDER",
     pushData: {
       title: "Out for Delivery 🛵",
       body: "Your order #453C1B is on the way!",
       deepLinkType: "ORDER_TRACKING",
       deepLinkParams: { orderId: "453C1B" },
     },
   });

   // New product alert
   await notifyUser({
     userId,
     type: "MARKETING",
     pushData: {
       title: "New Arrival 🛒",
       body: "Check out the latest Amul products!",
       deepLinkType: "PRODUCT",
       deepLinkParams: { productId: "abc123" },
       imageUrl: "https://...",
     },
   });

   // Offer / sale
   await notifyUser({
     userId,
     type: "MARKETING",
     pushData: {
       title: "50% Off Today Only 🎉",
       body: "Use code SUMMER20",
       deepLinkType: "OFFER",
       deepLinkParams: { offerId: "SUMMER20" },
     },
   });

   // Category promotion
   await notifyUser({
     userId,
     type: "MARKETING",
     pushData: {
       title: "Snacks on Sale 🍟",
       body: "Check out today's snack deals",
       deepLinkType: "CATEGORY",
       deepLinkParams: { categoryId: "snacks", categoryName: "Snacks" },
     },
   });

   // Campaign banner
   await notifyUser({
     userId,
     type: "MARKETING",
     pushData: {
       title: "Weekend Special 🎯",
       body: "Open to see the offer",
       deepLinkType: "CAMPAIGN",
       deepLinkParams: { banner: { title: "Weekend Sale", imageUrl: "https://..." } },
     },
   });
───────────────────────────────────────────────────────────────────────────── */
exports.notifyUser = async ({
  userId,
  type,
  pushData,      // { title, body, deepLinkType, deepLinkParams, data, imageUrl }
  whatsappData,
}) => {

  try {

    const user = await User.findById(userId);
    if (!user) {
      console.log("⚠️ User not found:", userId);
      return;
    }

    /* ───────────────────────────────────────────
       PUSH NOTIFICATIONS
    ─────────────────────────────────────────── */
    if (pushData) {

      const {
        title,
        body,
        imageUrl = null,
        deepLinkType,   // e.g. "ORDER_TRACKING", "PRODUCT", "OFFER" etc.
        deepLinkParams, // e.g. { orderId: "453C1B" }
        data: rawData,  // optional: caller can pass pre-built data object directly
      } = pushData;

      // ✅ Build deep link data — deepLinkType takes priority, rawData as fallback
      const data = deepLinkType
        ? buildDeepLinkData(deepLinkType, deepLinkParams ?? {})
        : (rawData ?? {});

      console.log("🔗 Deep link data:", JSON.stringify(data));

      let pushStatus = "FAILED";
      let pushError  = null;

      /* ───────── TRY FCM FIRST ───────── */
      if (user.fcmToken) {
        try {
          await sendFCM({ token: user.fcmToken, title, body, imageUrl, data, type });
          pushStatus = "SENT";
          console.log("✅ FCM push sent to", userId);
        } catch (err) {
          console.log("❌ FCM failed:", err.message);
          pushError = err.message;

          // Remove invalid/expired FCM token
          if (
            err.code === "messaging/registration-token-not-registered" ||
            err.message?.includes("not registered")
          ) {
            await User.findByIdAndUpdate(userId, { fcmToken: null });
            console.log("⚠️ Invalid FCM token removed for", userId);
          }

          /* ───────── FALLBACK TO EXPO ───────── */
          if (user.expoPushToken) {
            try {
              await sendPush({ expoPushToken: user.expoPushToken, title, body, data, imageUrl });
              pushStatus = "SENT";
              pushError  = null;
              console.log("✅ Expo fallback push sent to", userId);
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
          await sendPush({ expoPushToken: user.expoPushToken, title, body, data, imageUrl });
          pushStatus = "SENT";
          console.log("✅ Expo push sent to", userId);
        } catch (err) {
          pushError = err.message;
          console.log("❌ Expo push failed:", err.message);
        }
      }

      else {
        console.log("⚠️ No push token available for user", userId);
      }

      /* ───────── SAVE PUSH LOG ───────── */
      await Notification.create({
        user:     userId,
        type,
        channel:  "PUSH",
        title,
        body,
        imageUrl,
        data,
        status:   pushStatus,
        ...(pushError && { error: pushError }),
      });
    }

    /* ───────────────────────────────────────────
       WHATSAPP NOTIFICATIONS
    ─────────────────────────────────────────── */
    if (whatsappData && user.phone) {
      try {
        const phone = user.phone.replace(/\D/g, "");
        await sendWhatsAppTemplate(phone, whatsappData.template, whatsappData.params || []);

        await Notification.create({
          user: userId, type, channel: "WHATSAPP",
          template: whatsappData.template, status: "SENT",
        });
        console.log("✅ WhatsApp sent to", userId);

      } catch (err) {
        await Notification.create({
          user: userId, type, channel: "WHATSAPP",
          template: whatsappData.template, status: "FAILED", error: err.message,
        });
        console.log("❌ WhatsApp failed:", err.message);
      }
    }

  } catch (err) {
    console.log("❌ notifyUser error:", err.message);
  }
};