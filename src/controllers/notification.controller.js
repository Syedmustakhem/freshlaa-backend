const fetch   = require("node-fetch");
const axios   = require("axios");
const sendFCM = require("../utils/sendFCM");

/* ─────────────────────────────────────────────────────────────────────────────
   DEEP LINK SCREEN MAP
   Used by the test endpoint to build the correct data payload.
─────────────────────────────────────────────────────────────────────────────  */
const SCREEN_PAYLOADS = {
  OrderTracking:    (p) => ({ screen: "OrderTracking",    orderId:      p.orderId      ?? "TEST_ORDER" }),
  ProductDetails:   (p) => ({ screen: "ProductDetails",   productId:    p.productId    ?? "TEST_PRODUCT" }),
  OffersScreen:     (p) => ({ screen: "OffersScreen",      offerId:      p.offerId      ?? "TEST_OFFER" }),
  CategoryProducts: (p) => ({ screen: "CategoryProducts", categoryId:   p.categoryId   ?? "snacks", categoryName: p.categoryName ?? "Snacks" }),
  Campaign:         (p) => ({ screen: "Campaign",         banner:       JSON.stringify(p.banner ?? { title: "Test Campaign" }) }),
};

/* ─────────────────────────────────────────────────────────────────────────────
   TEST PUSH — supports Expo token, FCM token, and all 5 deep link screens

   POST /api/notifications/test-push
   Body:
   {
     "pushToken":    "ExponentPushToken[...]",   // Expo token
     "fcmToken":     "dGhpc2lz...",              // FCM token (optional)
     "title":        "Test Notification",
     "body":         "Tap to open a screen",
     "screen":       "OrderTracking",            // one of the 5 screens below
     "screenParams": { "orderId": "453C1B" }     // params for that screen
   }

   Supported screens:
     OrderTracking    → screenParams: { orderId }
     ProductDetails   → screenParams: { productId }
     OffersScreen     → screenParams: { offerId }
     CategoryProducts → screenParams: { categoryId, categoryName }
     Campaign         → screenParams: { banner: { title, imageUrl } }
─────────────────────────────────────────────────────────────────────────────  */
exports.sendTestPush = async (req, res) => {
  try {
    const {
      pushToken,
      fcmToken,
      title        = "Freshlaa 🛒",
      body         = "This is a test notification 🚀",
      screen       = "OrderTracking",
      screenParams = {},
    } = req.body;

    if (!pushToken && !fcmToken) {
      return res.status(400).json({ message: "pushToken or fcmToken required" });
    }

    // ✅ Build correct deep link data for chosen screen
    const buildData = SCREEN_PAYLOADS[screen];
    if (!buildData) {
      return res.status(400).json({
        message: `Unknown screen: "${screen}". Valid screens: ${Object.keys(SCREEN_PAYLOADS).join(", ")}`,
      });
    }

    const data = buildData(screenParams);
    console.log("🔗 Test deep link data:", JSON.stringify(data));

    const results = {};

    /* ───────── SEND VIA EXPO ───────── */
    if (pushToken) {
      try {
        const expoRes = await axios.post(
          "https://exp.host/--/api/v2/push/send",
          {
            to:       pushToken,
            sound:    "default",
            title,
            body,
            data,           // ✅ deep link data attached
            priority: "high",
          },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
        );
        results.expo = expoRes.data;
        console.log("✅ Test Expo push sent:", expoRes.data);
      } catch (err) {
        results.expo = { error: err.message };
        console.log("❌ Test Expo push failed:", err.message);
      }
    }

    /* ───────── SEND VIA FCM ───────── */
    if (fcmToken) {
      try {
        const fcmResult = await sendFCM({ token: fcmToken, title, body, data });
        results.fcm = { success: true, response: fcmResult };
        console.log("✅ Test FCM push sent");
      } catch (err) {
        results.fcm = { error: err.message };
        console.log("❌ Test FCM push failed:", err.message);
      }
    }

    res.json({ success: true, screen, data, results });

  } catch (err) {
    console.error("Push test error:", err);
    res.status(500).json({ message: "Push test failed", error: err.message });
  }
};