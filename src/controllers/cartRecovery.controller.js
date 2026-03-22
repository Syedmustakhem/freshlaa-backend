// src/controllers/cartRecovery.controller.js

const AbandonedCart = require("../models/AbandonedCart");
const { Expo }      = require("expo-server-sdk");

const expo = new Expo();

/* ─────────────────────────────────────────
   POST /api/cart-recovery/sync
   Called from frontend on every cart change
   Body: { userId?, expoPushToken?, fcmToken?, items[], totalAmount }
───────────────────────────────────────── */
async function syncAbandonedCart(req, res) {
  try {
    const { userId, expoPushToken, fcmToken, items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      // ✅ Cart cleared — remove abandoned cart record
      const filter = userId ? { userId } : { expoPushToken };
      await AbandonedCart.findOneAndDelete(filter);
      return res.json({ success: true });
    }

    // ✅ Upsert — update cart snapshot, reset notification status
    const filter = userId ? { userId } : { expoPushToken };
    await AbandonedCart.findOneAndUpdate(
      filter,
      {
        userId:        userId        || null,
        expoPushToken: expoPushToken || null,
        fcmToken:      fcmToken      || null,
        items,
        totalAmount:   totalAmount   || 0,
        notified:      false,         // reset — they updated cart, give fresh window
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
   Called when user completes an order
   Marks the abandoned cart as recovered
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
   CRON JOB — run every 15 minutes
   Finds carts abandoned for 30+ mins
   Sends push notification
───────────────────────────────────────── */
async function runCartRecoveryCron() {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find carts that:
    // - were last updated 30+ mins ago
    // - not yet notified
    // - not already recovered
    // - have items
    // - have a push token
    const abandoned = await AbandonedCart.find({
      lastUpdatedAt: { $lte: thirtyMinsAgo },
      notified:      false,
      isRecovered:   false,
      "items.0":     { $exists: true },
      $or: [
        { expoPushToken: { $ne: null } },
        { fcmToken:      { $ne: null } },
      ],
    }).limit(100); // process max 100 per run

    if (!abandoned.length) {
      console.log("[CartRecovery] No abandoned carts found");
      return;
    }

    console.log(`[CartRecovery] Found ${abandoned.length} abandoned carts`);

    const messages = [];
    const ids      = [];

    for (const cart of abandoned) {
      if (!cart.expoPushToken || !Expo.isExpoPushToken(cart.expoPushToken)) continue;

      const firstName = cart.items[0]?.name || "items";
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
      console.log("[CartRecovery] No valid push tokens found");
      return;
    }

    // Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error("[CartRecovery] Push error:", err);
      }
    }

    // Mark as notified
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
   GET /api/cart-recovery/stats — admin
───────────────────────────────────────── */
async function getStats(req, res) {
  try {
    const [total, notified, recovered, pending] = await Promise.all([
      AbandonedCart.countDocuments(),
      AbandonedCart.countDocuments({ notified: true }),
      AbandonedCart.countDocuments({ isRecovered: true }),
      AbandonedCart.countDocuments({ notified: false, isRecovered: false, "items.0": { $exists: true } }),
    ]);

    const recoveryRate = notified > 0
      ? Math.round((recovered / notified) * 100)
      : 0;

    res.json({ success: true, total, notified, recovered, pending, recoveryRate });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

module.exports = { syncAbandonedCart, markRecovered, runCartRecoveryCron, getStats };