const Product = require("../models/Product");
const { getConfig } = require("./config.service");
const { applyCoupon } = require("./coupon.service");
const Campaign = require("../models/Campaign");
exports.calculateOrder = async (items, session = null, couponCode = null) => {
  let itemsTotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId).session(session);

    if (!product || !product.isActive) {
      throw new Error("Product not available");
    }

    const variantId = item.variantId || item.selectedVariant?._id;

    const variant = variantId
      ? product.variants.id(variantId)
      : product.variants.find(v => v.isDefault) || product.variants[0];

    if (!variant) throw new Error("Invalid variant selected");

    if (variant.stock < item.qty) {
      throw new Error(`${product.name} out of stock`);
    }

    let price = variant.price;

    if (product.offerPercentage > 0) {
      price -= (price * product.offerPercentage) / 100;
    }

    const itemTotal = price * item.qty;
    itemsTotal += itemTotal;

    validatedItems.push({
      product: product._id,
      name: product.name,
      variantId: variant._id,
      variantLabel: variant.label,
      price,
      qty: item.qty,
      total: itemTotal,
    });

    if (session) {
      variant.stock -= item.qty;
      await product.save({ session });
    }
  }

  const config = await getConfig();

  let deliveryFee =
    itemsTotal >= config.freeDeliveryLimit
      ? 0
      : config.deliveryFee;

  let grandTotal = itemsTotal + deliveryFee + config.handlingFee;

  /* ================= CAMPAIGN ================= */

  const campaign = await Campaign.findOne({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  let campaignDiscount = 0;

  if (campaign && itemsTotal >= campaign.minCartValue) {
    campaignDiscount = campaign.discountAmount;
    grandTotal -= campaignDiscount;
  }

  /* ================= COUPON ================= */

  let couponDiscount = 0;

  if (couponCode) {
    // 🔥 FIXED PARAM ORDER
    couponDiscount = await applyCoupon(itemsTotal, couponCode);
    grandTotal -= couponDiscount;
  }

  /* ================= SURGE ================= */

  if (config.surgeEnabled) {
    grandTotal *= config.surgeMultiplier;
  }

  if (grandTotal < 0) grandTotal = 0;

  /* ================= AVAILABLE COUPONS ================= */

  const availableCoupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gt: new Date() },
  }).select("code discountType discountValue minOrderAmount");

  return {
    validatedItems,
    itemsTotal: Math.round(itemsTotal),
    deliveryFee,
    handlingFee: config.handlingFee,
    couponDiscount: Math.round(couponDiscount),
    campaignDiscount: Math.round(campaignDiscount),
    totalSavings: Math.round(couponDiscount + campaignDiscount),
    grandTotal: Math.round(grandTotal),
    availableCoupons,   // ✅ IMPORTANT
  };
};