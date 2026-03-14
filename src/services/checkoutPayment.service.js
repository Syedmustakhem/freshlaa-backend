const CheckoutPaymentConfig = require("../models/CheckoutPaymentConfig");
const Order                 = require("../models/Order");
const mongoose              = require("mongoose"); // ✅ ADDED

let _configCache    = null;
let _configCachedAt = 0;
const CONFIG_TTL_MS = 60_000;

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

exports.getCheckoutPaymentOptions = async ({ userId, amount }) => {

  if (!userId) throw new Error("userId is required to fetch payment options");

  // ✅ FIX: Cast userId to ObjectId so MongoDB aggregate $match works correctly
  let oid;
  try {
    oid = new mongoose.Types.ObjectId(userId);
  } catch (e) {
    throw new Error("Invalid userId format");
  }

  const configs = await getPaymentConfigsCached();

  if (!configs || configs.length === 0) {
    throw new Error("No payment methods configured. Please contact support.");
  }

  const [codStats] = await Order.aggregate([
    {
      $match: {
        user:          oid, // ✅ FIXED: was userId (raw), now properly cast ObjectId
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

  const failureRate = totalCod >= 3 ? (failedCod / totalCod) * 100 : 0;
  const codAbuse    = failureRate > 40 || failedCod >= 5;

  const codAbuseReason = codAbuse
    ? `COD unavailable due to ${failedCod} cancellation${failedCod !== 1 ? "s" : ""} on previous orders`
    : null;

  return configs.map((config) => {

    let enabled = true;
    let reason  = null;

    if (amount < (config.minOrderAmount ?? 0)) {
      enabled = false;
      reason  = `Available on orders above ₹${config.minOrderAmount}`;
    }

    if (config.maxOrderAmount && amount > config.maxOrderAmount) {
      enabled = false;
      reason  = `Not available on orders above ₹${config.maxOrderAmount}`;
    }

    if (config.code === "COD" && codAbuse) {
      enabled = false;
      reason  = codAbuseReason;
    }

    return {
      id:      config.code,
      label:   config.label,
      enabled,
      reason,
      codFee:  config.code === "COD" && enabled ? (config.codFee ?? 0) : 0,
    };
  });
};