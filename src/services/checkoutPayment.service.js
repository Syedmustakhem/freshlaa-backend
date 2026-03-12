const CheckoutPaymentConfig = require("../models/CheckoutPaymentConfig");
const Order                 = require("../models/Order");

/* ─── PAYMENT CONFIG CACHE ──────────────────────────────────────────────────
   Payment configs change only when an admin updates them.
   Call invalidatePaymentConfigCache() in your admin config-update route:

     const { invalidatePaymentConfigCache } = require("../services/checkoutPayment.service");

     router.put("/admin/payment-config", adminAuth, async (req, res) => {
       await CheckoutPaymentConfig.findByIdAndUpdate(req.params.id, req.body);
       invalidatePaymentConfigCache(); // ← bust cache immediately
       res.json({ success: true });
     });
──────────────────────────────────────────────────────────────────────────── */
let _configCache    = null;
let _configCachedAt = 0;
const CONFIG_TTL_MS = 60_000; // 1 minute — safety net if invalidation is missed

async function getPaymentConfigsCached() {
  if (_configCache && Date.now() - _configCachedAt < CONFIG_TTL_MS) {
    return _configCache;
  }
  _configCache    = await CheckoutPaymentConfig.find({ enabled: true }).sort({ priority: 1 }).lean();
  _configCachedAt = Date.now();
  return _configCache;
}

exports.invalidatePaymentConfigCache = () => {
  _configCache    = null;
  _configCachedAt = 0;
};

/* ═══════════════════════════════════════════════════════════════
   GET CHECKOUT PAYMENT OPTIONS
   Returns an array of payment method objects for the given user + amount.
   Shape: { id, label, enabled, reason, codFee }
═══════════════════════════════════════════════════════════════ */

exports.getCheckoutPaymentOptions = async ({ userId, amount }) => {

  if (!userId) throw new Error("userId is required to fetch payment options");

  const configs = await getPaymentConfigsCached();

  if (!configs || configs.length === 0) {
    throw new Error("No payment methods configured. Please contact support.");
  }

  /* ── Single aggregate: total COD orders + cancelled count ──────────────
     Using $group avoids two separate countDocuments calls.
     Correct field: `status` with casing "Cancelled" (matches Order schema enum).
  ────────────────────────────────────────────────────────────────────────── */
  const [codStats] = await Order.aggregate([
    {
      $match: {
        user:          userId,
        paymentMethod: "COD",
      },
    },
    {
      $group: {
        _id:       null,
        total:     { $sum: 1 },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] },
        },
      },
    },
  ]);

  const totalCod  = codStats?.total     ?? 0;
  const failedCod = codStats?.cancelled ?? 0;

  // Only penalise users with enough history (min 3 orders).
  // Trigger: cancellation rate > 40% OR 5+ absolute cancellations.
  const failureRate = totalCod >= 3 ? (failedCod / totalCod) * 100 : 0;
  const codAbuse    = failureRate > 40 || failedCod >= 5;

  const codAbuseReason = codAbuse
    ? `COD unavailable due to ${failedCod} cancellation${failedCod !== 1 ? "s" : ""} on previous orders`
    : null;

  return configs.map((config) => {

    let enabled = true;
    let reason  = null;

    /* ── Amount range ── */
    if (amount < (config.minOrderAmount ?? 0)) {
      enabled = false;
      reason  = `Available on orders above ₹${config.minOrderAmount}`;
    }

    if (config.maxOrderAmount && amount > config.maxOrderAmount) {
      enabled = false;
      reason  = `Not available on orders above ₹${config.maxOrderAmount}`;
    }

    /* ── COD abuse block ── */
    if (config.code === "COD" && codAbuse) {
      enabled = false;
      reason  = codAbuseReason;
    }

    return {
      id:      config.code,
      label:   config.label,
      enabled,
      reason,
      // codFee is 0 when COD is disabled — prevents fee being applied to blocked method
      codFee:  config.code === "COD" && enabled ? (config.codFee ?? 0) : 0,
    };
  });
};