/**
 * price_alert.cron.js
 * Runs every 6 hours — checks all active price alerts
 * and sends push notifications when a product price drops.
 */

const cron = require("node-cron");
const PriceAlert = require("../models/PriceAlert");
const Product = require("../models/Product");
const User = require("../models/User");
const { notifyUser } = require("../services/notification.service");

/* ─────────────────────────────────────────────
   CHECK & NOTIFY — core logic
───────────────────────────────────────────── */
async function checkPriceDrops(productId = null) {
  console.log("🔔 [PriceAlertCron] Starting price drop check...");

  try {
    // 1. Get all active alerts with product data
    const query = { isActive: true };
    if (productId) {
      query.product = productId;
    }
    
    const alerts = await PriceAlert.find(query)
      .populate("product", "name price variants images")
      .lean();

    if (alerts.length === 0) {
      console.log("🔔 [PriceAlertCron] No active alerts. Done.");
      return;
    }

    console.log(`🔔 [PriceAlertCron] Checking ${alerts.length} alerts...`);

    let notified = 0;
    let skippedNoDrop = 0;
    let skippedAlreadyNotified = 0;

    for (const alert of alerts) {
      try {
        const product = alert.product;
        if (!product) {
          console.log(`  ⚠️ Alert ${alert._id}: product not found (deleted?)`);
          continue;
        }

        // Current price from first variant or flat price
        const currentPrice = product.variants?.[0]?.price || product.price || 0;
        const trackedPrice = alert.trackedPrice || 0;

        console.log(`  📊 ${product.name}: tracked=₹${trackedPrice}, current=₹${currentPrice}, lastNotified=₹${alert.lastNotifiedPrice || 'never'}`);

        // Skip if price hasn't dropped
        if (currentPrice >= trackedPrice) {
          skippedNoDrop++;
          console.log(`  ⏭️ No drop — skipping`);
          continue;
        }

        // Skip if we already notified for this exact price
        if (alert.lastNotifiedPrice === currentPrice) {
          skippedAlreadyNotified++;
          console.log(`  ⏭️ Already notified at ₹${currentPrice} — skipping`);
          continue;
        }

        // Check if user has FCM token
        const user = await User.findById(alert.user).select("fcmToken expoPushToken name phone").lean();
        console.log(`  👤 User ${alert.user}: fcmToken=${user?.fcmToken ? 'YES' : 'NO'}, expoPushToken=${user?.expoPushToken ? 'YES' : 'NO'}`);

        if (!user?.fcmToken && !user?.expoPushToken) {
          console.log(`  ⚠️ User has no push tokens — skipping notification`);
          continue;
        }

        // Calculate drop
        const dropAmount = trackedPrice - currentPrice;
        const dropPercent = Math.round((dropAmount / trackedPrice) * 100);

        console.log(`  🔽 Price dropped ₹${dropAmount} (${dropPercent}% off) — sending notification...`);

        // Ensure imageUrl is an absolute HTTPS URL
        let imageUrl = product.images?.[0] || null;
        if (imageUrl && imageUrl.startsWith("/")) {
          imageUrl = `https://api.freshlaa.com${imageUrl}`;
        }

        // ✅ IMPORTANT: Update alert FIRST to prevent double notifications in case of race condition
        await PriceAlert.findByIdAndUpdate(alert._id, {
          lastNotifiedAt: new Date(),
          lastNotifiedPrice: currentPrice,
        });

        // Send push notification using your existing notifyUser
        await notifyUser({
          userId: alert.user,
          type: "PRICE_ALERT",
          pushData: {
            title: "🔔 Price Drop Alert!",
            body: `You tracked ${product.name} at ₹${trackedPrice}. Now it's ₹${currentPrice}! Save ₹${dropAmount}!`,
            deepLinkType: "PRODUCT",
            deepLinkParams: {
              productId: product._id?.toString(),
              oldPrice: String(trackedPrice),
              newPrice: String(currentPrice),
            },
            imageUrl: imageUrl,
          },
        });

        notified++;
        console.log(`  ✅ Notified user ${alert.user} — ${product.name}: ₹${trackedPrice} → ₹${currentPrice}`);

      } catch (err) {
        console.error(`  ❌ Alert ${alert._id} error:`, err.message);
        continue; // Don't break the loop for one failure
      }
    }

    console.log(`🔔 [PriceAlertCron] Done. Sent ${notified} notifications. Skipped: ${skippedNoDrop} no drop, ${skippedAlreadyNotified} already notified.`);

  } catch (err) {
    console.error("🔔 [PriceAlertCron] Fatal error:", err);
  }
}

// ─────────────────────────────────────────────
// SCHEDULE: Every 6 hours (at minute 0)
// ─────────────────────────────────────────────
cron.schedule("0 */6 * * *", () => {
  checkPriceDrops();
});

console.log("🔔 [PriceAlertCron] Scheduled — runs every 6 hours.");

// Export for manual trigger if needed
module.exports = { checkPriceDrops };
