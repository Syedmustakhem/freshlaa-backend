const Product = require("../models/Product");
const HotelMenuItem = require("../models/HotelMenuItem");
const Campaign = require("../models/Campaign");
const Coupon = require("../models/Coupon");

const { getConfig } = require("./config.service");
const { applyCoupon } = require("./coupon.service");

/* ═══════════════════════════════════════════════════════════════
   CONFIG CACHE
   ✅ FIX 10: cache config for 1 minute instead of hitting DB
   on every single previewCheckout call
═══════════════════════════════════════════════════════════════ */

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

// Call this from your admin config update route to bust the cache immediately
exports.invalidateConfigCache = () => {
  _configCache    = null;
  _configCachedAt = 0;
};

/* ═══════════════════════════════════════════════════════════════
   CALCULATE ORDER
═══════════════════════════════════════════════════════════════ */

exports.calculateOrder = async (items, session = null, couponCode = null) => {

  /* ── ✅ FIX 9: batch fetch all products in two queries instead of N+1 ── */
  const allProductIds = items.map((i) => i.productId).filter(Boolean);

  const [allProducts, allHotelItems, activeCampaigns] = await Promise.all([
    Product.find({ _id: { $in: allProductIds } }).lean(),
    HotelMenuItem.find({ _id: { $in: allProductIds } }).lean(),
    // ✅ FIX 2: fetch campaigns early so we can verify campaign products server-side
    Campaign.find({
      isActive:  true,
      type:      { $in: ["CART_PROGRESS", "CART"] },
      startDate: { $lte: new Date() },
      endDate:   { $gte: new Date() },
    }).lean(),
  ]);

  // Build immutable lookup maps (lean docs — for reads)
  const productMap = {};
  for (const p of allProducts)   productMap[p._id.toString()] = { doc: p, model: "Product" };
  for (const p of allHotelItems) productMap[p._id.toString()] = { doc: p, model: "HotelMenuItem" };

  // ✅ FIX 2: campaign product map keyed by productId for server-side price verification
  const campaignProductMap = {};
  for (const c of activeCampaigns) {
    if (c.campaignProduct) {
      campaignProductMap[c.campaignProduct.toString()] = c;
    }
  }

  /* ── Mutable Mongoose docs for stock saves (only needed in transactions) ── */
  const mutableProductDocMap = {};
  if (session && allProductIds.length) {
    const mutableDocs = await Product.find({ _id: { $in: allProductIds } }).session(session);
    for (const p of mutableDocs) mutableProductDocMap[p._id.toString()] = p;
  }

  /* ═══════════════════════════════════════════════════════════
     ITEM VALIDATION LOOP
  ═══════════════════════════════════════════════════════════ */

  let itemsTotal   = 0;
  const validatedItems = [];

  for (const item of items) {

    /* ── Basic qty validation ── */
    if (!item.qty || item.qty <= 0) throw new Error("Invalid item quantity");
    if (item.qty > 20)              throw new Error("Max quantity per item is 20");

    const pid   = item.productId?.toString();
    const entry = productMap[pid];

    if (!entry) throw new Error(`Item not found: ${pid}`);

    const { doc: product, model: itemModel } = entry;

    if (product.isAvailable === false)
      throw new Error(`${product.name} is not available`);

    /* ───────────────────────────────────────────────────────
       ✅ FIX 2 + 3: CAMPAIGN PRODUCT
       Price always read from DB campaign record.
       Client finalPrice is completely ignored.
       Stock checked and deducted like any other product.
    ─────────────────────────────────────────────────────── */
    if (item.isCampaignProduct) {
      const campaign = campaignProductMap[pid];
      if (!campaign) throw new Error(`No active campaign found for product: ${pid}`);

      // ✅ FIX 2: campaign price from DB only
      const price     = campaign.campaignPrice ?? 1;
      const itemTotal = price * item.qty;

      // ✅ FIX 3: stock check + deduction for campaign products in transaction
      if (session) {
        const mutableDoc = mutableProductDocMap[pid];
        if (mutableDoc) {
          if (mutableDoc.stock !== undefined && mutableDoc.stock < item.qty) {
            throw new Error(`${product.name} is out of stock`);
          }
          if (mutableDoc.stock !== undefined) {
            mutableDoc.stock -= item.qty;
            await mutableDoc.save({ session });
          }
        }
      }

      itemsTotal += itemTotal;

      // ✅ FIX 1: productId field name — matches controller's buildFormattedItems
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
      });

      continue;
    }

    /* ───────────────────────────────────────────────────────
       NORMAL PRODUCT — variant resolution + offer price
    ─────────────────────────────────────────────────────── */

    let variant = null;
    let price   = 0;

    if (product.variants && product.variants.length > 0) {
      const variantId = item.variantId || item.selectedVariant?._id;
      const variants  = product.variants;

      variant = variantId
        ? variants.find((v) => v._id.toString() === variantId.toString())
        : variants.find((v) => v.isDefault) || variants[0];

      if (!variant) throw new Error(`Invalid variant for ${product.name}`);

      if (variant.stock !== undefined && variant.stock < item.qty) {
        throw new Error(`${product.name} (${variant.label}) is out of stock`);
      }

      price = variant.price;

    } else {
      price = product.basePrice || product.price;
      if (!price) throw new Error(`Price missing for ${product.name}`);

      // ✅ FIX 4: check base-product stock
      if (product.stock !== undefined && product.stock < item.qty) {
        throw new Error(`${product.name} is out of stock`);
      }
    }

    const originalPrice = price;

    /* ── Offer discount ── */
    if (product.offerPercentage > 0) {
      price = price - (price * product.offerPercentage) / 100;
    }

    price = Math.round(price);

    const itemTotal = price * item.qty;
    itemsTotal     += itemTotal;

    /* ── ✅ FIX 4: deduct stock for base products + variants in transaction ── */
    if (session) {
      const mutableDoc = mutableProductDocMap[pid];
      if (mutableDoc) {
        if (variant) {
          const mutableVariant = mutableDoc.variants?.id
            ? mutableDoc.variants.id(variant._id)
            : mutableDoc.variants?.find(
                (v) => v._id.toString() === variant._id.toString()
              );
          if (mutableVariant && mutableVariant.stock !== undefined) {
            mutableVariant.stock -= item.qty;
          }
        } else {
          // Base product stock
          if (mutableDoc.stock !== undefined) {
            mutableDoc.stock -= item.qty;
          }
        }
        await mutableDoc.save({ session });
      }
    }

    // ✅ FIX 1: productId — consistent with controller
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
    });
  }

  /* ═══════════════════════════════════════════════════════════
     CONFIG + FEES
  ═══════════════════════════════════════════════════════════ */

  // ✅ FIX 10: cached — no DB hit on every preview call
  const config = await getConfigCached();

  const deliveryFee = itemsTotal >= config.freeDeliveryLimit ? 0 : config.deliveryFee;
  const handlingFee = config.handlingFee ?? 0;
  const baseFees    = deliveryFee + handlingFee;

  /* ═══════════════════════════════════════════════════════════
     SURGE
     ✅ FIX 6: surge applied to items total BEFORE discounts,
     so discounts aren't applied to an already-inflated total
     which could produce weird or negative results
  ═══════════════════════════════════════════════════════════ */

  const surgeMultiplier  = config.surgeEnabled ? (config.surgeMultiplier ?? 1) : 1;
  const surgedItemsTotal = Math.round(itemsTotal * surgeMultiplier);

  /* ═══════════════════════════════════════════════════════════
     CAMPAIGNS
  ═══════════════════════════════════════════════════════════ */

  // thresholdTotal excludes ₹1 campaign items so they don't inflate unlock thresholds
  const thresholdTotal = validatedItems
    .filter((i) => !i.isCampaignProduct)
    .reduce((sum, i) => sum + i.total, 0);

  // Enrich campaign product docs for the response
  const cpIds = activeCampaigns
    .filter((c) => c.campaignProduct)
    .map((c) => c.campaignProduct);

  const cpDocs = cpIds.length
    ? await Product.find({ _id: { $in: cpIds } }).lean()
    : [];

  const cpDocMap = {};
  for (const p of cpDocs) cpDocMap[p._id.toString()] = p;

  let campaignDiscount = 0;
  let campaignProducts = [];

  for (const campaign of activeCampaigns) {
    const minCart = campaign.minCartValue || 0;
    if (thresholdTotal < minCart) continue;

    if (campaign.discountType === "PERCENT") {
      campaignDiscount += (thresholdTotal * campaign.discountValue) / 100;
    }

    if (campaign.discountType === "FLAT") {
      campaignDiscount += campaign.discountValue;
    }

    if (campaign.campaignProduct) {
      const p = cpDocMap[campaign.campaignProduct.toString()];
      if (p) {
        // ✅ FIX 12: use _id on POJO (not .id which is undefined on plain objects)
        const alreadyAdded = campaignProducts.some(
          (cp) => cp._id.toString() === p._id.toString()
        );
        if (!alreadyAdded) {
          campaignProducts.push({
            _id:           p._id,
            id:            p._id,  // kept for frontend compatibility
            name:          p.name,
            price:         p.basePrice || p.price,
            campaignPrice: campaign.campaignPrice ?? 1,
            image:         p.image || null,
          });
        }
      }
    }
  }

  // ✅ FIX 8: cap against surgedItemsTotal (not thresholdTotal) so we include fees in cap
  campaignDiscount = Math.min(Math.round(campaignDiscount), surgedItemsTotal);

  /* ═══════════════════════════════════════════════════════════
     COUPON
     ✅ FIX 11: propagate error — don't swallow it silently
     Controller catches it and returns 400 with message to frontend
  ═══════════════════════════════════════════════════════════ */

  let couponDiscount = 0;

  if (couponCode) {
    couponDiscount = await applyCoupon(thresholdTotal, couponCode);
    couponDiscount = Math.round(couponDiscount);
  }

  /* ═══════════════════════════════════════════════════════════
     GRAND TOTAL
     ✅ FIX 5: floor applied after ALL discounts, before returning
     ✅ FIX 6: surge baked into surgedItemsTotal, not re-applied here
  ═══════════════════════════════════════════════════════════ */

  let grandTotal  = surgedItemsTotal + baseFees;
  grandTotal     -= campaignDiscount;
  grandTotal     -= couponDiscount;

  if (grandTotal < 0) grandTotal = 0;

  /* ═══════════════════════════════════════════════════════════
     CART PROGRESS — next unlock threshold
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
     ✅ FIX 7: only return public coupons the user can actually use
  ═══════════════════════════════════════════════════════════ */

  const availableCoupons = await Coupon.find({
    isActive:       true,
    expiryDate:     { $gt: new Date() },
    isPublic:       true,                      // never expose staff/internal coupons
    minOrderAmount: { $lte: thresholdTotal },  // only show coupons user qualifies for
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
    grandTotal:       Math.round(grandTotal),
    availableCoupons,
  };
};