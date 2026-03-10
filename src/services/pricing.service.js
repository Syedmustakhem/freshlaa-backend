const Product = require("../models/Product");
const HotelMenuItem = require("../models/HotelMenuItem");
const Campaign = require("../models/Campaign");
const Coupon = require("../models/Coupon");

const { getConfig } = require("./config.service");
const { applyCoupon } = require("./coupon.service");

exports.calculateOrder = async (items, session = null, couponCode = null) => {

  let itemsTotal = 0;
  const validatedItems = [];

  /* ================= ITEM VALIDATION ================= */

  for (const item of items) {

    if (!item.qty || item.qty <= 0) throw new Error("Invalid item quantity");
    if (item.qty > 20) throw new Error("Max quantity exceeded");

    /* ─── CAMPAIGN PRODUCT: trust finalPrice from client, skip DB price calc ───
       isCampaignProduct flag is set by the frontend when adding a ₹1 deal item.
       We still validate the product exists & is available, but we use the
       campaignPrice (finalPrice) sent from client — NOT the DB price.
    ─────────────────────────────────────────────────────────────────────────── */
    if (item.isCampaignProduct && item.finalPrice !== undefined) {

      let product = await Product.findById(item.productId);
      if (!product) throw new Error(`Item not found: ${item.productId}`);
      if (product.isAvailable === false) throw new Error(`${product.name} is not available`);

      const price     = Number(item.finalPrice); // e.g. 1
      const itemTotal = price * item.qty;
      itemsTotal     += itemTotal;

      validatedItems.push({
        product:      product._id,
        itemModel:    "Product",
        name:         product.name,
        variantId:    null,
        variantLabel: null,
        price,
        qty:          item.qty,
        total:        itemTotal,
        isCampaignProduct: true,
      });

      continue; // skip normal price calculation below
    }

    /* ─── NORMAL PRODUCT ─── */

    let query = Product.findById(item.productId);
    if (session) query = query.session(session);
    let product   = await query;
    let itemModel = "Product";

    if (!product) {
      let hotelQuery = HotelMenuItem.findById(item.productId);
      if (session) hotelQuery = hotelQuery.session(session);
      product   = await hotelQuery;
      itemModel = "HotelMenuItem";
    }

    if (!product) throw new Error(`Item not found: ${item.productId}`);
    if (product.isAvailable === false) throw new Error(`${product.name} is not available`);

    /* ── VARIANT / PRICE ── */

    let variant = null;
    let price   = 0;

    if (product.variants && product.variants.length > 0) {
      const variantId = item.variantId || item.selectedVariant?._id;
      variant = variantId
        ? product.variants.id(variantId)
        : product.variants.find(v => v.isDefault) || product.variants[0];

      if (!variant) throw new Error(`Invalid variant for ${product.name}`);
      if (variant.stock !== undefined && variant.stock < item.qty) throw new Error(`${product.name} out of stock`);

      price = variant.price;
    } else {
      price = product.basePrice || product.price;
      if (!price) throw new Error(`Price missing for ${product.name}`);
    }

    /* ── PRODUCT OFFER ── */
    if (product.offerPercentage > 0) {
      price -= (price * product.offerPercentage) / 100;
    }

    price = Math.round(price);

    const itemTotal = price * item.qty;
    itemsTotal     += itemTotal;

    validatedItems.push({
      product:      product._id,
      itemModel,
      name:         product.name,
      variantId:    variant?._id || null,
      variantLabel: variant?.label || null,
      price,
      qty:          item.qty,
      total:        itemTotal,
    });

    /* ── STOCK UPDATE (only in transaction) ── */
    if (session && variant && variant.stock !== undefined) {
      variant.stock -= item.qty;
      await product.save({ session });
    }
  }

  /* ================= CONFIG ================= */

  const config = await getConfig();

  const deliveryFee =
    itemsTotal >= config.freeDeliveryLimit ? 0 : config.deliveryFee;

  let grandTotal = itemsTotal + deliveryFee + config.handlingFee;

  /* ================= CAMPAIGNS ================= */

  const campaigns = await Campaign.find({
    isActive: true,
    type: { $in: ["CART_PROGRESS", "CART"] },
    startDate: { $lte: new Date() },
    endDate:   { $gte: new Date() },
  }).lean();

  let campaignDiscount  = 0;
  let campaignProducts  = [];

  const campaignProductIds = campaigns
    .filter(c => c.campaignProduct)
    .map(c => c.campaignProduct);

  const campaignProductDocs = await Product.find({
    _id: { $in: campaignProductIds },
  }).lean();

  const productMap = {};
  campaignProductDocs.forEach(p => {
    productMap[p._id.toString()] = p;
  });

  /* ─── APPLY CAMPAIGNS ─── */

  // Non-campaign itemsTotal for threshold check (exclude ₹1 items from threshold)
  const thresholdTotal = validatedItems
    .filter(i => !i.isCampaignProduct)
    .reduce((sum, i) => sum + i.total, 0);

  for (const campaign of campaigns) {
    const minCart = campaign.minCartValue || 0;

    if (thresholdTotal >= minCart) {

      if (campaign.discountType === "PERCENT") {
        campaignDiscount += (thresholdTotal * campaign.discountValue) / 100;
      }

      if (campaign.discountType === "FLAT") {
        campaignDiscount += campaign.discountValue;
      }

      if (campaign.campaignProduct) {
        const product = productMap[campaign.campaignProduct.toString()];
        if (
          product &&
          !campaignProducts.some(p => p.id.toString() === product._id.toString())
        ) {
          campaignProducts.push({
            id:            product._id,
            name:          product.name,
            price:         product.basePrice || product.price,
            campaignPrice: campaign.campaignPrice || 1,
            image:         product.image || null,
          });
        }
      }
    }
  }

  campaignDiscount = Math.min(campaignDiscount, thresholdTotal);
  grandTotal      -= campaignDiscount;

  /* ================= CART PROGRESS ================= */

  let nextCampaign = null;

  const sortedCampaigns = campaigns
    .filter(c => c.type === "CART_PROGRESS" && c.minCartValue)
    .sort((a, b) => a.minCartValue - b.minCartValue);

  for (const c of sortedCampaigns) {
    if (thresholdTotal < c.minCartValue) {
      nextCampaign = c;
      break;
    }
  }

  let cartProgress = null;

  if (nextCampaign) {
    cartProgress = {
      currentCart: thresholdTotal,
      target:      nextCampaign.minCartValue,
      remaining:   nextCampaign.minCartValue - thresholdTotal,
      rewardName:  nextCampaign.discountType === "UNLOCK_PRODUCT"
        ? `Special Product ₹${nextCampaign.campaignPrice}`
        : nextCampaign.name,
    };
  }

  /* ================= COUPON ================= */

  let couponDiscount = 0;

  if (couponCode) {
    try {
      couponDiscount = await applyCoupon(thresholdTotal, couponCode);
      grandTotal    -= couponDiscount;
    } catch (err) {
      console.log("⚠️ Coupon skipped:", err.message);
    }
  }

  /* ================= SURGE PRICING ================= */

  if (config.surgeEnabled) {
    grandTotal = Math.round(grandTotal * config.surgeMultiplier);
  }

  if (grandTotal < 0) grandTotal = 0;

  /* ================= AVAILABLE COUPONS ================= */

  const availableCoupons = await Coupon.find({
    isActive:   true,
    expiryDate: { $gt: new Date() },
  })
    .select("code discountType discountValue minOrderAmount maxDiscount")
    .lean();

  /* ================= FINAL RESPONSE ================= */

  return {
    validatedItems,
    itemsTotal:       Math.round(itemsTotal),
    deliveryFee,
    handlingFee:      config.handlingFee,
    couponDiscount:   Math.round(couponDiscount),
    campaignDiscount: Math.round(campaignDiscount),
    campaignProducts,
    cartProgress,
    totalSavings:     Math.round(couponDiscount + campaignDiscount),
    grandTotal:       Math.round(grandTotal),
    availableCoupons,
  };
};