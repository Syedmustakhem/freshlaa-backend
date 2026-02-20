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

    const variant = product.variants.id(item.selectedVariant?._id);

    if (!variant) {
      throw new Error("Invalid variant selected");
    }

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

  const campaign = await Campaign.findOne({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  if (campaign && itemsTotal >= campaign.minCartValue) {
    grandTotal -= campaign.discountAmount;
  }

  if (couponCode) {
    const discount = await applyCoupon(couponCode, itemsTotal);
    grandTotal -= discount;
  }

  if (config.surgeEnabled) {
    grandTotal *= config.surgeMultiplier;
  }

  if (grandTotal < 0) grandTotal = 0;

  return {
    validatedItems,
    itemsTotal,
    deliveryFee,
    handlingFee: config.handlingFee,
    grandTotal,
  };
};