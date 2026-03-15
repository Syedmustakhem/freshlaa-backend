const Product       = require("../models/Product");
const HotelMenuItem = require("../models/HotelMenuItem");
const Campaign      = require("../models/Campaign");
const Coupon        = require("../models/Coupon");

const { getConfig }    = require("./config.service");
const { applyCoupon }  = require("./coupon.service");

/* ─── CONFIG CACHE ──────────────────────────────────────────────────────────
   Busted by calling invalidateConfigCache() from your admin config-update route
──────────────────────────────────────────────────────────────────────────── */
let _configCache    = null;
let _configCachedAt = 0;
const CONFIG_TTL_MS = 60_000; // 1 minute

async function getConfigCached() {
  if (_configCache && Date.now() - _configCachedAt < CONFIG_TTL_MS) {
    return _configCache;
  }
  _configCache    = await getConfig();
  _configCachedAt = Date.now();
  return _configCache;
}

exports.invalidateConfigCache = () => {
  _configCache    = null;
  _configCachedAt = 0;
};

/* ═══════════════════════════════════════════════════════════════
   CALCULATE ORDER
═══════════════════════════════════════════════════════════════ */

exports.calculateOrder = async (items, session = null, couponCode = null) => {

  const allProductIds = items.map((i) => i.productId).filter(Boolean);

  /* ── Batch fetch all read-only (lean) docs + campaigns in parallel ── */
  const [allProducts, allHotelItems, activeCampaigns] = await Promise.all([
    Product.find({ _id: { $in: allProductIds } }).lean(),
    HotelMenuItem.find({ _id: { $in: allProductIds } }).lean(),
    Campaign.find({
      isActive:  true,
      type:      { $in: ["CART_PROGRESS", "CART"] },
      startDate: { $lte: new Date() },
      endDate:   { $gte: new Date() },
    }).lean(),
  ]);

  // Unified lookup map: productId → { doc, model }
  const productMap = {};
  for (const p of allProducts)   productMap[p._id.toString()] = { doc: p, model: "Product" };
  for (const p of allHotelItems) productMap[p._id.toString()] = { doc: p, model: "HotelMenuItem" };

  // Campaign product map: productId → campaign (for server-side price verification)
  const campaignProductMap = {};
  for (const c of activeCampaigns) {
    if (c.campaignProduct) campaignProductMap[c.campaignProduct.toString()] = c;
  }

  /* ── Mutable Mongoose docs for stock deduction (transaction only) ──────────
     FIX: fetch BOTH Product AND HotelMenuItem mutable docs.
     Previously only Product was fetched, so hotel item stock was never deducted.
  ────────────────────────────────────────────────────────────────────────── */
  const mutableDocMap = {};

  if (session && allProductIds.length) {
    const [mutableProducts, mutableHotelItems] = await Promise.all([
      Product.find({ _id: { $in: allProductIds } }).session(session),
      HotelMenuItem.find({ _id: { $in: allProductIds } }).session(session),
    ]);

    for (const p of mutableProducts)   mutableDocMap[p._id.toString()] = p;
    for (const p of mutableHotelItems) mutableDocMap[p._id.toString()] = p;
  }

  /* ═══════════════════════════════════════════════════════════
     ITEM VALIDATION LOOP
  ═══════════════════════════════════════════════════════════ */

  let itemsTotal   = 0;
  const validatedItems = [];

  for (const item of items) {

    if (!item.qty || item.qty <= 0) throw new Error("Invalid item quantity");
    if (item.qty > 20)              throw new Error("Max quantity per item is 20");

    const pid   = item.productId?.toString();
    const entry = productMap[pid];

    if (!entry) throw new Error(`Item not found: ${pid}`);

    const { doc: product, model: itemModel } = entry;

    if (product.isAvailable === false)
      throw new Error(`${product.name} is not available`);

    /* ── Campaign product ─────────────────────────────────────────────────── */
    if (item.isCampaignProduct) {
      const campaign = campaignProductMap[pid];
      if (!campaign) throw new Error(`No active campaign found for product: ${pid}`);

      const price     = campaign.campaignPrice ?? 1;
      const itemTotal = price * item.qty;

      if (session) {
        const mutableDoc = mutableDocMap[pid];
        if (mutableDoc?.stock !== undefined) {
          if (mutableDoc.stock < item.qty) throw new Error(`${product.name} is out of stock`);
          mutableDoc.stock -= item.qty;
          await mutableDoc.save({ session });
        }
      }

      itemsTotal += itemTotal;

      validatedItems.push({
        productId:         product._id,
        itemModel:         "Product",
        name:              product.name,
        variantId:         null,
        variantLabel:      null,
        originalPrice:     product.basePrice || product.price || price,
        price,
        finalPrice:        price,
        qty:               item.qty,
        total:             itemTotal,
        isCampaignProduct: true,
        // FIX: pass-through fields consumed by buildFormattedItems in order.controller
        hotelId:        item.hotelId        || null,
        selectedAddons: item.selectedAddons || [],
        customizations: item.customizations || {},
      });

      continue;
    }

    /* ── Normal product — variant resolution + offer price ───────────────── */
    let variant = null;
    let price   = 0;

    if (product.variants && product.variants.length > 0) {
      const variantId = item.variantId || item.selectedVariant?._id;
      const variants  = product.variants;

      variant = variantId
        ? variants.find((v) => v._id.toString() === variantId.toString())
        : variants.find((v) => v.isDefault) || variants[0];

      if (!variant) throw new Error(`Invalid variant for ${product.name}`);

      if (variant.stock !== undefined && variant.stock < item.qty)
        throw new Error(`${product.name} (${variant.label}) is out of stock`);

      price = variant.price;

    } else {
      price = product.basePrice || product.price;
      if (!price) throw new Error(`Price missing for ${product.name}`);

      if (product.stock !== undefined && product.stock < item.qty)
        throw new Error(`${product.name} is out of stock`);
    }

    const originalPrice = price;

    if (product.offerPercentage > 0) {
      price = price - (price * product.offerPercentage) / 100;
    }

    price = Math.round(price);

    const itemTotal = price * item.qty;
    itemsTotal     += itemTotal;

    /* ── Stock deduction (transaction) ───────────────────────────────────── */
    if (session) {
      const mutableDoc = mutableDocMap[pid];
      if (mutableDoc) {
        if (variant) {
          const mutableVariant = mutableDoc.variants?.id
            ? mutableDoc.variants.id(variant._id)
            : mutableDoc.variants?.find((v) => v._id.toString() === variant._id.toString());

          if (mutableVariant?.stock !== undefined) mutableVariant.stock -= item.qty;
        } else {
          if (mutableDoc.stock !== undefined) mutableDoc.stock -= item.qty;
        }
        await mutableDoc.save({ session });
      }
    }

    // FIX: include hotelId, selectedAddons, customizations so order.controller
    // buildFormattedItems receives the correct data instead of undefined
    validatedItems.push({
      productId:         product._id,
      itemModel,
      name:              product.name,
      variantId:         variant?._id   || null,
      variantLabel:      variant?.label || null,
      originalPrice,
      price,
      finalPrice:        price,
      qty:               item.qty,
      total:             itemTotal,
      isCampaignProduct: false,
      hotelId:           item.hotelId        || null,
      selectedAddons:    item.selectedAddons || [],
      customizations:    item.customizations || {},
    });
  }

  /* ═══════════════════════════════════════════════════════════
     CONFIG + FEES
  ═══════════════════════════════════════════════════════════ */

  const config = await getConfigCached();
const deliveryFee = itemsTotal >= config.freeDeliveryLimit ? 0 : config.deliveryFee;
const handlingFee = 0; // ✅ handling fee removed
  const baseFees    = deliveryFee + handlingFee;

  /* ── Surge ── */
  const surgeMultiplier  = config.surgeEnabled ? (config.surgeMultiplier ?? 1) : 1;
  const surgedItemsTotal = Math.round(itemsTotal * surgeMultiplier);

  /* ═══════════════════════════════════════════════════════════
     CAMPAIGNS
  ═══════════════════════════════════════════════════════════ */

  // Exclude ₹1 campaign items from unlock threshold calculations
  const thresholdTotal = validatedItems
    .filter((i) => !i.isCampaignProduct)
    .reduce((sum, i) => sum + i.total, 0);

  const cpIds = activeCampaigns
    .filter((c) => c.campaignProduct)
    .map((c) => c.campaignProduct);

  const cpDocs   = cpIds.length ? await Product.find({ _id: { $in: cpIds } }).lean() : [];
  const cpDocMap = {};
  for (const p of cpDocs) cpDocMap[p._id.toString()] = p;

  let campaignDiscount = 0;
  let campaignProducts = [];

  for (const campaign of activeCampaigns) {
    if (thresholdTotal < (campaign.minCartValue || 0)) continue;

    if (campaign.discountType === "PERCENT") campaignDiscount += (thresholdTotal * campaign.discountValue) / 100;
    if (campaign.discountType === "FLAT")    campaignDiscount += campaign.discountValue;

    if (campaign.campaignProduct) {
      const p = cpDocMap[campaign.campaignProduct.toString()];
      if (p && !campaignProducts.some((cp) => cp._id.toString() === p._id.toString())) {
        campaignProducts.push({
          _id:           p._id,
          id:            p._id,
          name:          p.name,
          price:         p.basePrice || p.price,
          campaignPrice: campaign.campaignPrice ?? 1,
          image:         p.image || null,
        });
      }
    }
  }

  campaignDiscount = Math.min(Math.round(campaignDiscount), surgedItemsTotal);

  /* ═══════════════════════════════════════════════════════════
     COUPON
  ═══════════════════════════════════════════════════════════ */

  let couponDiscount = 0;
  if (couponCode) {
    couponDiscount = Math.round(await applyCoupon(thresholdTotal, couponCode));
  }

  /* ═══════════════════════════════════════════════════════════
     GRAND TOTAL
  ═══════════════════════════════════════════════════════════ */

  const grandTotal = Math.max(
    0,
    Math.round(surgedItemsTotal + baseFees - campaignDiscount - couponDiscount)
  );

  /* ═══════════════════════════════════════════════════════════
     CART PROGRESS
  ═══════════════════════════════════════════════════════════ */

  let cartProgress = null;

  const progressCampaigns = activeCampaigns
    .filter((c) => c.type === "CART_PROGRESS" && c.minCartValue)
    .sort((a, b) => a.minCartValue - b.minCartValue);

  for (const c of progressCampaigns) {
    if (thresholdTotal < c.minCartValue) {
      cartProgress = {
        currentCart: thresholdTotal,
        target:      c.minCartValue,
        remaining:   c.minCartValue - thresholdTotal,
        rewardName:  c.discountType === "UNLOCK_PRODUCT"
          ? `Special Product ₹${c.campaignPrice}`
          : c.name,
      };
      break;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     AVAILABLE COUPONS
  ═══════════════════════════════════════════════════════════ */

  const availableCoupons = await Coupon.find({
    isActive:       true,
    expiryDate:     { $gt: new Date() },
    isPublic:       true,
    minOrderAmount: { $lte: thresholdTotal },
  })
    .select("code discountType discountValue minOrderAmount maxDiscount")
    .lean();

  /* ═══════════════════════════════════════════════════════════
     RETURN
  ═══════════════════════════════════════════════════════════ */

  return {
    validatedItems,
    itemsTotal:       Math.round(itemsTotal),
    surgedItemsTotal: Math.round(surgedItemsTotal),
    deliveryFee,
    handlingFee,
    couponDiscount,
    campaignDiscount,
    campaignProducts,
    cartProgress,
    totalSavings:     Math.round(couponDiscount + campaignDiscount),
    grandTotal,
    availableCoupons,
  };
};