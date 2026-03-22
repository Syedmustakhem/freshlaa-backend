// src/controllers/restock.controller.js
// ✅ Uses dynamic import for expo-server-sdk (ESM-only package)

const RestockNotification = require("../models/RestockNotification");
const Product             = require("../models/Product");

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
      {
        productId,
        userId:        userId        || null,
        expoPushToken: expoPushToken || null,
        fcmToken:      fcmToken      || null,
        notified:      false,
        notifiedAt:    null,
      },
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
    // ✅ Dynamic import — fixes ERR_REQUIRE_ESM
    const { Expo } = await import("expo-server-sdk");
    const expo     = new Expo();

    const product = await Product.findById(productId).select("name images");
    if (!product) return;

    const subscribers = await RestockNotification.find({
      productId,
      notified: false,
    });

    if (!subscribers.length) {
      console.log(`[Restock] No subscribers for product ${productId}`);
      return;
    }

    console.log(`[Restock] Notifying ${subscribers.length} subscribers for "${product.name}"`);

    const messages = [];
    const ids      = [];

    for (const sub of subscribers) {
      if (sub.expoPushToken && Expo.isExpoPushToken(sub.expoPushToken)) {
        messages.push({
          to:    sub.expoPushToken,
          sound: "default",
          title: "🎉 Back in stock!",
          body:  `${product.name} is available again. Order now before it runs out!`,
          data:  { screen: "ProductDetails", productId: String(productId) },
        });
        ids.push(sub._id);
      }
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error("[Restock] Push send error:", err);
      }
    }

    await RestockNotification.updateMany(
      { _id: { $in: ids } },
      { notified: true, notifiedAt: new Date() }
    );

    console.log(`[Restock] ✅ Sent ${messages.length} notifications`);

  } catch (err) {
    console.error("[Restock] Trigger error:", err);
  }
}

/* ─────────────────────────────────────────
   GET /api/restock/count/:productId
───────────────────────────────────────── */
async function getSubscriberCount(req, res) {
  try {
    const { productId } = req.params;
    const count = await RestockNotification.countDocuments({ productId, notified: false });
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