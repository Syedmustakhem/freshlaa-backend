/**
 * price_alert.cron.js
 * Runs every 6 hours — checks all active price alerts
 * and sends push notifications when a product price drops.
 */

const cron       = require("node-cron");
const PriceAlert = require("../models/PriceAlert");
const Product    = require("../models/Product");
const { notifyUser } = require("../services/notification.service");

/* ─────────────────────────────────────────────
   CHECK & NOTIFY — core logic
───────────────────────────────────────────── */
async function checkPriceDrops() {
  console.log("🔔 [PriceAlertCron] Starting price drop check...");

  try {
    // 1. Get all active alerts with product data
    const alerts = await PriceAlert.find({ isActive: true })
      .populate("product", "name price variants images")
      .lean();

    if (alerts.length === 0) {
      console.log("🔔 [PriceAlertCron] No active alerts. Done.");
      return;
    }

    console.log(`🔔 [PriceAlertCron] Checking ${alerts.length} alerts...`);

    let notified = 0;

    for (const alert of alerts) {
      try {
        const product = alert.product;
        if (!product) continue;

        // Current price from first variant or flat price
        const currentPrice = product.variants?.[0]?.price || product.price || 0;
        const trackedPrice = alert.trackedPrice || 0;

        // Skip if price hasn't dropped
        if (currentPrice >= trackedPrice) continue;

        // Skip if we already notified for this exact price
        if (alert.lastNotifiedPrice === currentPrice) continue;

        // Calculate drop
        const dropAmount  = trackedPrice - currentPrice;
        const dropPercent = Math.round((dropAmount / trackedPrice) * 100);

        // Send push notification using your existing notifyUser
        await notifyUser({
          userId: alert.user,
          type: "MARKETING",
          pushData: {
            title: "🔔 Price Drop Alert!",
            body: `${product.name} dropped ₹${dropAmount} (${dropPercent}% off) — Now ₹${currentPrice}!`,
            deepLinkType: "PRODUCT",
            deepLinkParams: { productId: product._id?.toString() },
            imageUrl: product.images?.[0] || null,
          },
        });

        // Update alert — mark as notified to avoid spam
        await PriceAlert.findByIdAndUpdate(alert._id, {
          lastNotifiedAt: new Date(),
          lastNotifiedPrice: currentPrice,
        });

        notified++;
        console.log(`  ✅ Notified user ${alert.user} — ${product.name}: ₹${trackedPrice} → ₹${currentPrice}`);

      } catch (err) {
        console.error(`  ❌ Alert ${alert._id} error:`, err.message);
        continue; // Don't break the loop for one failure
      }
    }

    console.log(`🔔 [PriceAlertCron] Done. Sent ${notified} notifications.`);

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
