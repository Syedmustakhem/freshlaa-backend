// src/controllers/cartRecovery.controller.js
// ✅ Uses dynamic import for expo-server-sdk (ESM-only package)

const AbandonedCart = require("../models/AbandonedCart");

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
    // ✅ Dynamic import — fixes ERR_REQUIRE_ESM
    const { Expo } = await import("expo-server-sdk");
    const expo     = new Expo();

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
      if (!cart.expoPushToken || !Expo.isExpoPushToken(cart.expoPushToken)) continue;

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

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error("[CartRecovery] Push error:", err);
      }
    }

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