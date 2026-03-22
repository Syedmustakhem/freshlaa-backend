// src/controllers/cartRecovery.controller.js
// ✅ Uses axios to call Expo Push API directly — no expo-server-sdk needed

const AbandonedCart = require("../models/AbandonedCart");
const axios         = require("axios");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ✅ Send push notifications via Expo REST API directly
async function sendExpoPushNotifications(messages) {
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    try {
      await axios.post(EXPO_PUSH_URL, chunk, {
        headers: {
          "Content-Type":  "application/json",
          "Accept":        "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        timeout: 10000,
      });
    } catch (err) {
      console.error("[Push] Send error:", err?.message);
    }
  }
}

const isExpoPushToken = (token) =>
  typeof token === "string" &&
  (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));

/* ─────────────────────────────────────────
   POST /api/cart-recovery/sync
───────────────────────────────────────── */
async function syncAbandonedCart(req, res) {
  try {
    const { userId, expoPushToken, fcmToken, items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      const filter = userId ? { userId } : { expoPushToken };
      await AbandonedCart.findOneAndDelete(filter);
      return res.json({ success: true });
    }

    const filter = userId ? { userId } : { expoPushToken };
    await AbandonedCart.findOneAndUpdate(
      filter,
      {
        userId:        userId        || null,
        expoPushToken: expoPushToken || null,
        fcmToken:      fcmToken      || null,
        items,
        totalAmount:   totalAmount   || 0,
        notified:      false,
        notifiedAt:    null,
        isRecovered:   false,
        lastUpdatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("[CartRecovery] Sync error:", err);
    return res.status(500).json({ success: false });
  }
}

/* ─────────────────────────────────────────
   POST /api/cart-recovery/recovered
───────────────────────────────────────── */
async function markRecovered(req, res) {
  try {
    const { userId, expoPushToken } = req.body;
    const filter = userId ? { userId } : { expoPushToken };
    await AbandonedCart.findOneAndUpdate(filter, {
      isRecovered: true,
      recoveredAt: new Date(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[CartRecovery] Mark recovered error:", err);
    return res.status(500).json({ success: false });
  }
}

/* ─────────────────────────────────────────
   CRON JOB
───────────────────────────────────────── */
async function runCartRecoveryCron() {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const abandoned = await AbandonedCart.find({
      lastUpdatedAt: { $lte: thirtyMinsAgo },
      notified:      false,
      isRecovered:   false,
      "items.0":     { $exists: true },
      $or: [
        { expoPushToken: { $ne: null } },
        { fcmToken:      { $ne: null } },
      ],
    }).limit(100);

    if (!abandoned.length) {
      console.log("[CartRecovery] No abandoned carts found");
      return;
    }

    console.log(`[CartRecovery] Found ${abandoned.length} abandoned carts`);

    const messages = [];
    const ids      = [];

    for (const cart of abandoned) {
      if (!isExpoPushToken(cart.expoPushToken)) continue;

      const itemCount = cart.items.reduce((sum, i) => sum + i.qty, 0);
      const total     = cart.totalAmount ? `₹${Math.round(cart.totalAmount)}` : "";

      messages.push({
        to:    cart.expoPushToken,
        sound: "default",
        title: "🛒 Your cart misses you!",
        body:  `You left ${itemCount} item${itemCount > 1 ? "s" : ""} behind${total ? ` worth ${total}` : ""}. Complete your order before they run out!`,
        data:  { screen: "CartScreen" },
      });
      ids.push(cart._id);
    }

    if (!messages.length) {
      console.log("[CartRecovery] No valid push tokens");
      return;
    }

    await sendExpoPushNotifications(messages);

    await AbandonedCart.updateMany(
      { _id: { $in: ids } },
      { notified: true, notifiedAt: new Date() }
    );

    console.log(`[CartRecovery] ✅ Sent ${messages.length} recovery notifications`);

  } catch (err) {
    console.error("[CartRecovery] Cron error:", err);
  }
}

/* ─────────────────────────────────────────
   GET /api/cart-recovery/stats
───────────────────────────────────────── */
async function getStats(req, res) {
  try {
    const [total, notified, recovered, pending] = await Promise.all([
      AbandonedCart.countDocuments(),
      AbandonedCart.countDocuments({ notified: true }),
      AbandonedCart.countDocuments({ isRecovered: true }),
      AbandonedCart.countDocuments({ notified: false, isRecovered: false, "items.0": { $exists: true } }),
    ]);

    const recoveryRate = notified > 0 ? Math.round((recovered / notified) * 100) : 0;
    res.json({ success: true, total, notified, recovered, pending, recoveryRate });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

module.exports = { syncAbandonedCart, markRecovered, runCartRecoveryCron, getStats };