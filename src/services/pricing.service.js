const Product = require("../models/Product");
const { getConfig } = require("./config.service");
const { applyCoupon } = require("./coupon.service");
const Campaign = require("../models/Campaign");
const Coupon = require("../models/Coupon");

exports.calculateOrder = async (items, session = null, couponCode = null) => {

  let itemsTotal = 0;
  const validatedItems = [];

  for (const item of items) {

    console.log("🧾 CHECKOUT ITEM:", item);

    let product;

    /* 🔥 LOAD ITEM MODEL */

    if (item.itemModel === "HotelItem") {
      const HotelItem = require("../models/HotelItem");
      product = await HotelItem.findById(item.productId).session(session);
    } else {
      product = await Product.findById(item.productId).session(session);
    }

    if (!product) {
      throw new Error(`Item not found: ${item.productId}`);
    }

    if (product.isActive === false) {
      throw new Error(`${product.name} is not available`);
    }

    /* 🔥 VARIANT + NON-VARIANT SUPPORT */

    let variant = null;
    let price = 0;

    if (product.variants && product.variants.length > 0) {

      const variantId = item.variantId || item.selectedVariant?._id;

      variant = variantId
        ? product.variants.id(variantId)
        : product.variants.find(v => v.isDefault) || product.variants[0];

      if (!variant) {
        throw new Error(`Invalid variant for ${product.name}`);
      }

      if (variant.stock !== undefined && variant.stock < item.qty) {
        throw new Error(`${product.name} out of stock`);
      }

      price = variant.price;

    } else {

      /* HOTEL ITEMS OR PRODUCTS WITHOUT VARIANTS */

      price = product.price;

      if (!price) {
        throw new Error(`Price missing for ${product.name}`);
      }

    }

    /* 🔥 PRODUCT OFFER */

    if (product.offerPercentage > 0) {
      price -= (price * product.offerPercentage) / 100;
    }

    const itemTotal = price * item.qty;
    itemsTotal += itemTotal;

    validatedItems.push({
      product: product._id,
      itemModel: item.itemModel || "Product",
      name: product.name,
      variantId: variant?._id || null,
      variantLabel: variant?.label || null,
      price,
      qty: item.qty,
      total: itemTotal,
    });

    /* 🔥 STOCK UPDATE ONLY WHEN VARIANT EXISTS */

    if (session && variant && variant.stock !== undefined) {
      variant.stock -= item.qty;
      await product.save({ session });
    }
  }

  /* ================= CONFIG ================= */

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
    try {
      couponDiscount = await applyCoupon(itemsTotal, couponCode);
      grandTotal -= couponDiscount;
    } catch (err) {
      console.log("⚠️ Coupon skipped:", err.message);
      couponDiscount = 0;
    }
  }

  /* ================= SURGE ================= */

  if (config.surgeEnabled) {
    grandTotal *= config.surgeMultiplier;
  }

  if (grandTotal < 0) grandTotal = 0;

  /* ================= AVAILABLE COUPONS ================= */

  const availableCoupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gte: new Date().setHours(0,0,0,0) }
  }).select("code discountType discountValue minOrderAmount maxDiscount");

  return {
    validatedItems,
    itemsTotal: Math.round(itemsTotal),
    deliveryFee,
    handlingFee: config.handlingFee,
    couponDiscount: Math.round(couponDiscount),
    campaignDiscount: Math.round(campaignDiscount),
    totalSavings: Math.round(couponDiscount + campaignDiscount),
    grandTotal: Math.round(grandTotal),
    availableCoupons
  };
};