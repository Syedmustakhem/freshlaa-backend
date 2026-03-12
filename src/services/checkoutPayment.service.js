const CheckoutPaymentConfig = require("../models/CheckoutPaymentConfig");
const Order = require("../models/Order");

/* ═══════════════════════════════════════════════════════════════
   CONFIG CACHE
   ✅ FIX 4: cache payment configs — they change rarely (admin only)
═══════════════════════════════════════════════════════════════ */

let _configCache    = null;
let _configCachedAt = 0;
const CONFIG_TTL_MS = 60_000; // 1 minute

async function getPaymentConfigsCached() {
  if (_configCache && Date.now() - _configCachedAt < CONFIG_TTL_MS) {
    return _configCache;
  }
  _configCache    = await CheckoutPaymentConfig.find({ enabled: true }).sort({ priority: 1 }).lean();
  _configCachedAt = Date.now();
  return _configCache;
}

// Call from your admin panel when payment config is updated
exports.invalidatePaymentConfigCache = () => {
  _configCache    = null;
  _configCachedAt = 0;
};

/* ═══════════════════════════════════════════════════════════════
   GET CHECKOUT PAYMENT OPTIONS
═══════════════════════════════════════════════════════════════ */

exports.getCheckoutPaymentOptions = async ({ userId, amount }) => {

  // ✅ FIX 7: guard against undefined userId before any DB query
  if (!userId) throw new Error("userId is required to fetch payment options");

  // ✅ FIX 4: cached fetch
  const configs = await getPaymentConfigsCached();

  // ✅ FIX 5: fail loudly if no configs found — likely a misconfiguration
  if (!configs || configs.length === 0) {
    throw new Error("No payment methods configured. Please contact support.");
  }

  /* ── ✅ FIX 1 + 2: single aggregate instead of two sequential countDocuments ──
     Correct field name: `status` (not `orderStatus`)
     Correct enum casing: "Cancelled" (not "CANCELLED")
     RTO removed — not in Order model enum
  ── */
  const [codStats] = await Order.aggregate([
    {
      $match: {
        user:          userId,         // mongoose ObjectId passed directly
        paymentMethod: "COD",
      },
    },
    {
      $group: {
        _id:       null,
        total:     { $sum: 1 },
        cancelled: {
          $sum: {
            $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const totalCod    = codStats?.total     ?? 0;
  const failedCod   = codStats?.cancelled ?? 0;

  // ✅ FIX 3: refined failure rate — only flag if user has enough history (min 3 orders)
  // and cancellation rate exceeds 40%, OR absolute cancellations exceed 5
  const failureRate    = totalCod >= 3 ? (failedCod / totalCod) * 100 : 0;
  const codAbuse       = failureRate > 40 || failedCod >= 5;
  const codAbuseReason = codAbuse
    ? `COD unavailable due to ${failedCod} cancellation${failedCod !== 1 ? "s" : ""} on previous orders`
    : null;

  return configs.map((config) => {

    let enabled = true;
    let reason  = null;

    /* ── Amount range check ── */
    if (amount < (config.minOrderAmount ?? 0)) {
      enabled = false;
      reason  = `Available on orders above ₹${config.minOrderAmount}`;
    }

    if (config.maxOrderAmount && amount > config.maxOrderAmount) {
      enabled = false;
      reason  = `Not available on orders above ₹${config.maxOrderAmount}`;
    }

    /* ── COD abuse check ── */
    if (config.code === "COD" && codAbuse) {
      enabled = false;
      reason  = codAbuseReason;
    }

    return {
      id:      config.code,
      label:   config.label,
      enabled,
      reason,
      // ✅ FIX 6: expose codFee clearly so pricing service/controller can add it to total
      codFee:  config.code === "COD" && enabled ? (config.codFee ?? 0) : 0,
    };
  });
};