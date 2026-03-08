const Product = require("../models/Product");
const HotelMenuItem = require("../models/HotelMenuItem");
const Campaign = require("../models/Campaign");
const Coupon = require("../models/Coupon");

const { getConfig } = require("./config.service");
const { applyCoupon } = require("./coupon.service");

exports.calculateOrder = async (items, session = null, couponCode = null) => {

  let itemsTotal = 0;
  const validatedItems = [];

  for (const item of items) {

    console.log("🧾 CHECKOUT ITEM:", item);

    /* ================= LOAD ITEM ================= */

    let product = await Product.findById(item.productId).session(session);
    let itemModel = "Product";

    if (!product) {
      product = await HotelMenuItem.findById(item.productId).session(session);
itemModel = "HotelMenuItem";
    }

    if (!product) {
      throw new Error(`Item not found: ${item.productId}`);
    }

    if (product.isAvailable === false) {
      throw new Error(`${product.name} is not available`);
    }

    /* ================= VARIANT / PRICE ================= */

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

      price = product.basePrice;

      if (!price) {
        throw new Error(`Price missing for ${product.name}`);
      }

    }

    /* ================= PRODUCT OFFER ================= */

    if (product.offerPercentage > 0) {
      price -= (price * product.offerPercentage) / 100;
    }

    const itemTotal = price * item.qty;
    itemsTotal += itemTotal;

    validatedItems.push({
      product: product._id,
      itemModel,
      name: product.name,
      variantId: variant?._id || null,
      variantLabel: variant?.label || null,
      price,
      qty: item.qty,
      total: itemTotal,
    });

    /* ================= STOCK UPDATE ================= */

    if (session && variant && variant.stock !== undefined) {
      variant.stock -= item.qty;
      await product.save({ session });
    }
  }

  /* ================= CONFIG ================= */

  const config = await getConfig();

  const deliveryFee =
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
    }
  }

  /* ================= SURGE PRICING ================= */

  if (config.surgeEnabled) {
    grandTotal *= config.surgeMultiplier;
  }

  if (grandTotal < 0) grandTotal = 0;

  /* ================= AVAILABLE COUPONS ================= */

  const availableCoupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gt: new Date() }
  }).select("code discountType discountValue minOrderAmount maxDiscount");

  /* ================= FINAL RESPONSE ================= */

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