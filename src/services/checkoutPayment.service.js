const CheckoutPaymentConfig = require("../models/CheckoutPaymentConfig");
const Order = require("../models/Order");

exports.getCheckoutPaymentOptions = async ({ userId, amount }) => {

  const configs = await CheckoutPaymentConfig.find({ enabled: true })
    .sort({ priority: 1 });

  // Calculate COD abuse
  const totalCod = await Order.countDocuments({
    user: userId,
    paymentMethod: "COD",
  });

  const failedCod = await Order.countDocuments({
    user: userId,
    paymentMethod: "COD",
    orderStatus: { $in: ["CANCELLED", "RTO"] },
  });

  const failureRate = totalCod > 0
    ? (failedCod / totalCod) * 100
    : 0;

  return configs.map(config => {

    let enabled = true;
    let reason = null;

    if (amount < config.minOrderAmount) {
      enabled = false;
      reason = `Available above ₹${config.minOrderAmount}`;
    }

    if (config.maxOrderAmount && amount > config.maxOrderAmount) {
      enabled = false;
      reason = `Not available above ₹${config.maxOrderAmount}`;
    }

    if (config.code === "COD") {
      if (failureRate > 50 || failedCod >= 3) {
        enabled = false;
        reason = "COD disabled due to repeated cancellations";
      }
    }

    return {
      id: config.code,
      label: config.label,
      enabled,
      reason,
      codFee: config.codFee,
    };
  });
};