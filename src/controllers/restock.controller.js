// src/controllers/restock.controller.js
// ✅ Uses axios to call Expo Push API directly — no expo-server-sdk needed

const RestockNotification = require("../models/RestockNotification");
const Product             = require("../models/Product");
const axios               = require("axios");
const sendFCM             = require("../utils/sendFCM");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const isExpoPushToken = (token) =>
  typeof token === "string" &&
  (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));

async function sendExpoPushNotifications(messages) {
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    try {
      await axios.post(EXPO_PUSH_URL, chunk, {
        headers: {
          "Content-Type":    "application/json",
          "Accept":          "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        timeout: 10000,
      });
    } catch (err) {
      console.error("[Push] Send error:", err?.message);
    }
  }
}

/* ─────────────────────────────────────────
   POST /api/restock/subscribe
───────────────────────────────────────── */
async function subscribe(req, res) {
  try {
    const { productId, userId, expoPushToken, fcmToken } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId required" });
    }
    if (!userId && !expoPushToken && !fcmToken) {
      return res.status(400).json({ success: false, message: "userId or push token required" });
    }

    const product = await Product.findById(productId).select("stock name");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.stock > 0) {
      return res.status(400).json({ success: false, message: "Product is in stock" });
    }

    const filter = userId
      ? { productId, userId }
      : { productId, expoPushToken };

    await RestockNotification.findOneAndUpdate(
      filter,
      { productId, userId: userId || null, expoPushToken: expoPushToken || null, fcmToken: fcmToken || null, notified: false, notifiedAt: null },
      { upsert: true, new: true }
    );

    console.log(`[Restock] Subscribed: product=${productId} user=${userId || "guest"}`);
    return res.json({ success: true, message: "You will be notified when back in stock" });

  } catch (err) {
    console.error("[Restock] Subscribe error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ─────────────────────────────────────────
   triggerRestock — called from product.controller
───────────────────────────────────────── */
async function triggerRestock(productId) {
  try {
    const product = await Product.findById(productId).select("name images");
    if (!product) return;

    const subscribers = await RestockNotification.find({ productId, notified: false });
    if (!subscribers.length) {
      console.log(`[Restock] No subscribers for product ${productId}`);
      return;
    }

    console.log(`[Restock] Notifying ${subscribers.length} subscribers for "${product.name}"`);

    const expoMessages = [];
    const idsToUpdate  = [];
    const imageUrl     = product.images?.[0] || null;

    for (const sub of subscribers) {
      let sent = false;

      // 1. Try FCM first if token exists
      if (sub.fcmToken) {
        try {
          await sendFCM({
            token: sub.fcmToken,
            title: "🎉 Back in stock!",
            body:  `${product.name} is available again. Order now before it runs out!`,
            imageUrl,
            data:  { screen: "ProductDetails", productId: String(productId) },
            type: "MARKETING"
          });
          sent = true;
        } catch (fcmErr) {
          console.error(`[Restock] FCM failed for user ${sub.userId}:`, fcmErr.message);
        }
      }

      // 2. Fallback to Expo if FCM wasn't used/failed and Expo token exists
      if (!sent && isExpoPushToken(sub.expoPushToken)) {
        expoMessages.push({
          to:    sub.expoPushToken,
          sound: "default",
          title: "🎉 Back in stock!",
          body:  `${product.name} is available again. Order now before it runs out!`,
          data:  { screen: "ProductDetails", productId: String(productId) },
          // Expo rich media (image)
          _displayInForeground: true,
        });
        sent = true;
      }

      if (sent) {
        idsToUpdate.push(sub._id);
      }
    }

    if (expoMessages.length > 0) {
      await sendExpoPushNotifications(expoMessages);
    }

    if (idsToUpdate.length > 0) {
      await RestockNotification.updateMany(
        { _id: { $in: idsToUpdate } },
        { notified: true, notifiedAt: new Date() }
      );
    }

    console.log(`[Restock] ✅ Processed notifications for ${idsToUpdate.length} subscribers`);

  } catch (err) {
    console.error("[Restock] Trigger error:", err);
  }
}

/* ─────────────────────────────────────────
   GET /api/restock/count/:productId
───────────────────────────────────────── */
async function getSubscriberCount(req, res) {
  try {
    const count = await RestockNotification.countDocuments({ productId: req.params.productId, notified: false });
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ─────────────────────────────────────────
   DELETE /api/restock/unsubscribe
───────────────────────────────────────── */
async function unsubscribe(req, res) {
  try {
    const { productId, userId, expoPushToken } = req.body;
    const filter = userId ? { productId, userId } : { productId, expoPushToken };
    await RestockNotification.findOneAndDelete(filter);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { subscribe, triggerRestock, getSubscriberCount, unsubscribe };