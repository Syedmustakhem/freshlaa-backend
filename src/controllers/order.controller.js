const mongoose    = require("mongoose");
const crypto      = require("crypto");
const webpush     = require("web-push");

const Product       = require("../models/Product");
const Order         = require("../models/Order");
const User          = require("../models/User");
const AdminPush     = require("../models/AdminPush");
const HotelMenuItem = require("../models/HotelMenuItem");

const razorpay          = require("../utils/razorpay.instance");
const { notifyUser }    = require("../services/notification.service");
const { sendWhatsAppTemplate, sendWhatsAppDocument } = require("../services/whatsapp.service");
const { calculateOrder }   = require("../services/pricing.service");
const checkoutService      = require("../services/checkoutPayment.service");
const generateInvoice      = require("../utils/generateInvoice");

/* ─── VAPID SETUP ───────────────────────────────────────────────────────── */
try {
  webpush.setVapidDetails(
    "mailto:support@freshlaa.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error("VAPID config error:", err.message);
}

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const ALLOWED_SLOTS = [
  "30m", "1h", "5h", "12h", "1d",
  "tmr_morning", "tmr_afternoon", "tmr_evening",
];

const STATUS_MESSAGES = {
  Placed:         { title: "Order Confirmed 🛒",  body: "Your order has been confirmed!",  imageUrl: "https://api.freshlaa.com/assets/order-placed.png"    },
  Packed:         { title: "Order Packed 📦",     body: "Your order is packed and ready!", imageUrl: "https://api.freshlaa.com/assets/order-packed.png"    },
  OutForDelivery: { title: "Out for Delivery 🛵", body: "Your order is on the way!",       imageUrl: "https://api.freshlaa.com/assets/order-delivery.png"  },
  Delivered:      { title: "Order Delivered 🎉",  body: "Enjoy your order! Rate us ⭐",    imageUrl: "https://api.freshlaa.com/assets/order-delivered.png" },
  Cancelled:      { title: "Order Cancelled ❌",  body: "Your order has been cancelled.",  imageUrl: "https://api.freshlaa.com/assets/order-cancelled.png" },
};

/* ─── HELPERS ───────────────────────────────────────────────────────────── */

// ── Generate unique order ID: FL + 6 digits e.g. FL847293 ────────────────────
async function generateOrderId() {
  let id, exists;
  do {
    const digits = Math.floor(100000 + Math.random() * 900000); // always 6 digits
    id = `FL${digits}`;
    exists = await Order.findOne({ orderId: id }).lean();
  } while (exists); // retry on collision (extremely rare)
  return id;
}

function resolveScheduledTime(slot) {
  const now = new Date();

  const tomorrowAt = (hourIST) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hourIST - 5, 30, 0, 0);
    return d;
  };

  const map = {
    "30m":           new Date(now.getTime() + 30 * 60 * 1000),
    "1h":            new Date(now.getTime() + 60 * 60 * 1000),
    "5h":            new Date(now.getTime() + 5  * 60 * 60 * 1000),
    "12h":           new Date(now.getTime() + 12 * 60 * 60 * 1000),
    "1d":            new Date(now.getTime() + 24 * 60 * 60 * 1000),
    "tmr_morning":   tomorrowAt(8),
    "tmr_afternoon": tomorrowAt(12),
    "tmr_evening":   tomorrowAt(17),
  };

  return map[slot] ?? null;
}

async function buildFormattedItems(validatedItems) {
  const productIds   = [];
  const hotelItemIds = [];

  for (const i of validatedItems) {
    if (i.itemModel === "HotelMenuItem") hotelItemIds.push(i.productId);
    else                                  productIds.push(i.productId);
  }

  const [products, hotelItems] = await Promise.all([
    productIds.length   ? Product.find({ _id: { $in: productIds } }).lean()         : [],
    hotelItemIds.length ? HotelMenuItem.find({ _id: { $in: hotelItemIds } }).lean() : [],
  ]);

  const productMap = Object.fromEntries(
    [...products, ...hotelItems].map((p) => [p._id.toString(), p])
  );

  return validatedItems.map((i) => {
    const product = productMap[i.productId?.toString()];
    return {
      productId:         i.productId,
      name:              product?.name       || "Product",
      image:             product?.images?.[0] || "",
      originalPrice:     i.originalPrice     ?? i.price,
      finalPrice:        i.finalPrice        ?? i.price,
      qty:               i.qty,
      itemModel:         i.itemModel         || "Product",
      isCampaignProduct: i.isCampaignProduct || false,
      variant:           i.variantId ? { key: i.variantId, label: i.variantLabel || "", price: i.price } : undefined,
      selectedAddons:    i.selectedAddons    || [],
      customizations:    i.customizations    || {},
      hotelId:           i.hotelId           || undefined,
    };
  });
}

async function notifyAdmins(payload) {
  try {
    const subs  = await AdminPush.find().select("subscription");
    const body  = JSON.stringify(payload);
    const stale = [];

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s.subscription, body);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) stale.push(s._id);
        }
      })
    );

    if (stale.length) await AdminPush.deleteMany({ _id: { $in: stale } });
  } catch (err) {
    console.error("Admin push error:", err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   PREVIEW CHECKOUT
═══════════════════════════════════════════════════════════════ */

exports.previewCheckout = async (req, res) => {
  try {
    const { items, couponCode } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: "No items provided" });
    }

    const result = await calculateOrder(items, null, couponCode || null);
    return res.json({ success: true, ...result });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   CREATE ORDER
═══════════════════════════════════════════════════════════════ */

exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      paymentMethod     = "COD",
      payment,
      couponCode,
      deliveryType,
      deliverySlot,
      orderForSomeone,
      recipient,
      deliveryInstructions,
    } = req.body;

    /* ── Basic validation ── */
    if (!Array.isArray(items) || !items.length)
      throw new Error("No items in order");

    if (!address || typeof address !== "object" || !address.pincode)
      throw new Error("A valid address with pincode is required");

    if (!["COD", "ONLINE"].includes(paymentMethod))
      throw new Error("Invalid payment method");

    /* ── Delivery slot validation ── */
    let scheduledTime = null;
    if (deliveryType === "scheduled") {
      if (!ALLOWED_SLOTS.includes(deliverySlot))
        throw new Error(`Invalid delivery slot. Allowed: ${ALLOWED_SLOTS.join(", ")}`);

      scheduledTime = resolveScheduledTime(deliverySlot);
      if (!scheduledTime)
        throw new Error("Could not resolve delivery time for slot: " + deliverySlot);

      // Only block past time for tomorrow slots — not for 30m/1h/5h/12h/1d
      // (those are always in the future relative to now)
      const futureSlotsOnly = ["tmr_morning", "tmr_afternoon", "tmr_evening"];
      if (futureSlotsOnly.includes(deliverySlot) && scheduledTime < new Date())
        throw new Error("Scheduled time cannot be in the past");
    }

    /* ── Recipient validation ── */
    if (orderForSomeone) {
      if (!recipient?.name?.trim())
        throw new Error("Recipient name is required");
      if (!/^[6-9]\d{9}$/.test(recipient?.phone?.trim() || ""))
        throw new Error("Invalid recipient phone number");
    }

    /* ── Pricing ── */
    const result = await calculateOrder(items, null, couponCode);

    /* ── Payment method eligibility ── */
    const methods = await checkoutService.getCheckoutPaymentOptions({
      userId: req.user._id,
      amount: result?.grandTotal || 0,
    });

    const selectedMethod = methods.find((m) => m.id === paymentMethod);

    if (!selectedMethod || !selectedMethod.enabled) {
      throw new Error(
        selectedMethod?.reason ||
        `Payment method '${paymentMethod}' not available. Options: ${methods.map((m) => m.id).join(", ")}`
      );
    }

    /* ── Apply COD fee ── */
    const codFee = selectedMethod.codFee ?? 0;
    if (codFee > 0) {
      result.grandTotal += codFee;
      result.codFee      = codFee;
    }

    /* ── Online payment verification ── */
    let paymentStatus = "Pending";
    let razorpayData  = null;

    if (paymentMethod === "ONLINE") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payment || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
        throw new Error("Incomplete payment data");

      const duplicate = await Order.findOne({
        "paymentDetails.razorpay_payment_id": razorpay_payment_id,
      });
      if (duplicate) throw new Error("Duplicate payment detected");

      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expected !== razorpay_signature)
        throw new Error("Payment signature verification failed");

      paymentStatus = "Paid";
      razorpayData  = payment;
    }

    /* ── Build formatted items ── */
    const formattedItems = await buildFormattedItems(result.validatedItems);

    /* ── Generate FL order ID ── */
    const orderId = await generateOrderId();

    /* ── Persist order ── */
    const order = await Order.create({
      orderId,                              // ← FL + 6 digits e.g. FL847293
      user:          req.user._id,
      items:         formattedItems,
      address,
      deliveryType:  deliveryType || "instant",
      deliverySlot:  deliverySlot || null,
      scheduledTime,

      isGiftOrder: !!orderForSomeone,
      recipient:   orderForSomeone
        ? {
            name:  recipient.name.trim(),
            phone: recipient.phone.trim(),
            note:  recipient.note?.trim() || "",
          }
        : null,
      deliveryInstructions: deliveryInstructions || {},

      paymentMethod,
      paymentStatus,
      paymentDetails: razorpayData,

      couponCode: couponCode || null,
      pricing: {
        itemsTotal:       result.itemsTotal       ?? 0,
        deliveryFee:      result.deliveryFee      ?? 0,
        handlingFee:      result.handlingFee      ?? 0,
        codFee:           result.codFee           ?? 0,
        couponDiscount:   result.couponDiscount   ?? 0,
        campaignDiscount: result.campaignDiscount ?? 0,
        totalSavings:     result.totalSavings     ?? 0,
        grandTotal:       result.grandTotal,
      },

      total:  result.grandTotal,
      status: "Placed",
    });

    /* ── Post-save side effects ── */
    const user = await User.findById(req.user._id).lean();

    if (global.io) {
      global.io.emit("new-order", {
        orderId:         order._id.toString(),
        friendlyOrderId: order.orderId,
        total:           order.total,
        items:           order.items.length,
      });
    }

    notifyAdmins({
      title: "🛒 New Order",
      body:  `${order.orderId} · ₹${order.total}`,
      data:  { orderId: order._id.toString() },
    });

    notifyUser({
      userId:   user._id,
      type:     "ORDER",
      pushData: {
        title:    "Order Placed 🛒",
        body:     `${order.orderId} · ₹${order.total} has been placed`,
        imageUrl: "https://api.freshlaa.com/assets/order-placed.png",
        data:     { screen: "OrderTracking", orderId: order._id.toString() },
      },
    });

    if (user?.phone) {
      sendWhatsAppTemplate(
        user.phone.replace("+", ""),
        "order_placed",
        [user.name || "Customer", "Freshlaa Grocery", order.orderId, `₹${order.total}`]
      ).catch((err) => console.error("WhatsApp order_placed error:", err.message));
    }

    return res.status(201).json({ success: true, order });

  } catch (error) {
    console.error("❌ CREATE ORDER ERROR:", error.message);
    console.error("❌ STACK:", error.stack);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   CANCEL ORDER
═══════════════════════════════════════════════════════════════ */

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Access denied" });

    if (["Delivered", "Cancelled", "OutForDelivery"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order with status: ${order.status}`,
      });
    }

    if (
      order.paymentMethod === "ONLINE" &&
      order.paymentStatus === "Paid"   &&
      order.paymentDetails?.razorpay_payment_id
    ) {
      if (
        ["Initiated", "Processed"].includes(order.refundStatus) ||
        order.paymentStatus === "Refunded"
      ) throw new Error("Refund already initiated or processed");

      const refund = await razorpay.payments.refund(
        order.paymentDetails.razorpay_payment_id,
        { amount: Math.round(order.total * 100) }
      );

      order.paymentStatus = "Refunded";
      order.refundId      = refund.id;
      order.refundStatus  = "Initiated";
      order.refundAmount  = order.total;
    }

    for (const item of order.items) {
      const product =
        (await Product.findById(item.productId)) ||
        (await HotelMenuItem.findById(item.productId));

      if (!product) continue;

      if (item.variant?.key && product.variants?.length) {
        const variant = product.variants.id(item.variant.key);
        if (variant) variant.stock += item.qty;
      } else {
        product.stock += item.qty;
      }

      await product.save();
    }

    order.status             = "Cancelled";
    order.cancellationReason = req.body.reason || null;
    order.cancelledAt        = new Date();
    await order.save();

    return res.json({ success: true, message: "Order cancelled", order });

  } catch (error) {
    console.error("❌ CANCEL ORDER ERROR:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET MY ORDERS (paginated)
═══════════════════════════════════════════════════════════════ */

exports.getMyOrders = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page  || "1"),  1);
    const limit = Math.min(parseInt(req.query.limit || "20"), 50);
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "items.productId", model: "Product", select: "images" })
        .lean()
        .then(orders =>
          orders.map(order => ({
            ...order,
            items: order.items.map(item => ({
              ...item,
              // ✅ use saved image if exists, fallback to populated product images
              image: (item.image && item.image.trim() !== "")
                ? item.image
                : item.productId?.images?.[0] || "",
            })),
          }))
        ),
      Order.countDocuments({ user: req.user._id }),
    ]);

    return res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages:   Math.ceil(total / limit),
        hasMore: skip + orders.length < total,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET ORDER BY ID
═══════════════════════════════════════════════════════════════ */

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Access denied" });

    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET LAST ORDER
═══════════════════════════════════════════════════════════════ */

exports.getLastOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET ACTIVE ORDERS
═══════════════════════════════════════════════════════════════ */

exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user:   req.user._id,
      status: { $nin: ["Delivered", "Cancelled"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GENERATE DELIVERY OTP
   Called automatically when order status → OutForDelivery
   Also callable manually from admin panel
   POST /api/orders/:id/generate-otp
═══════════════════════════════════════════════════════════════ */

exports.generateDeliveryOTP = async (req, res) => {
  try {
    const isAdmin = !!req.admin;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Only generate for OutForDelivery orders
    if (order.status !== "OutForDelivery") {
      return res.status(400).json({
        success: false,
        message: `OTP can only be generated when order is OutForDelivery. Current: ${order.status}`,
      });
    }

    // Don't regenerate if already verified
    if (order.otpVerified) {
      return res.status(400).json({ success: false, message: "OTP already verified for this order" });
    }

    // Generate fresh 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    order.deliveryOTP        = otp;
    order.otpGeneratedAt     = new Date();
    order.otpFailedAttempts  = 0; // reset on regenerate
    await order.save();

    // Emit OTP to customer via socket in real time
    if (global.io) {
      global.io.to(order._id.toString()).emit("delivery-otp-generated", {
        orderId: order._id.toString(),
        otp,     // ✅ customer sees OTP in their app
      });
      console.log(`🔐 OTP generated for order ${order.orderId}: ${otp}`);
    }

    return res.json({ success: true, otp, orderId: order._id });

  } catch (error) {
    console.error("❌ GENERATE OTP ERROR:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   VERIFY DELIVERY OTP
   Called from rider app or admin panel when rider enters OTP
   If correct → marks order as Delivered automatically
   POST /api/orders/:id/verify-otp   { otp: "1234" }
═══════════════════════════════════════════════════════════════ */

exports.verifyDeliveryOTP = async (req, res) => {
  try {
    const isAdmin = !!req.admin || !!req.user?.isAdmin;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { otp } = req.body;
    if (!otp?.trim()) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    const order = await Order.findById(req.params.id).populate("user");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Guard: must be OutForDelivery
    if (order.status !== "OutForDelivery") {
      return res.status(400).json({
        success: false,
        message: `Cannot verify OTP for order with status: ${order.status}`,
      });
    }

    // Guard: already verified
    if (order.otpVerified) {
      return res.status(400).json({ success: false, message: "OTP already verified" });
    }

    // Guard: too many failed attempts (fraud prevention)
    if ((order.otpFailedAttempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        message:  "Too many incorrect OTP attempts. Please regenerate OTP.",
        code:     "OTP_LOCKED",
      });
    }

    // ── Wrong OTP ──────────────────────────────────────────────────────────
    if (order.deliveryOTP !== otp.trim()) {
      order.otpFailedAttempts = (order.otpFailedAttempts || 0) + 1;
      await order.save();

      const remaining = Math.max(0, 5 - order.otpFailedAttempts);
      return res.status(400).json({
        success:    false,
        message:    `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
        code:       "OTP_WRONG",
        attemptsLeft: remaining,
      });
    }

    // ── Correct OTP → mark as Delivered ───────────────────────────────────
    order.status       = "Delivered";
    order.otpVerified  = true;
    await order.save();

    // Emit to customer app in real time
    if (global.io) {
      const roomId = order._id.toString();

      // 1. Tell the customer their order is delivered
      global.io.to(roomId).emit("order-status-updated", {
        orderId:   roomId,
        status:    "Delivered",
        title:     "Order Delivered 🎉",
        message:   "Your order has been delivered. Enjoy!",
        updatedAt: new Date().toISOString(),
      });

      // 2. Tell the customer the OTP was verified
      global.io.to(roomId).emit("otp-verified", {
        orderId: roomId,
        status:  "Delivered",
      });

      console.log(`✅ OTP verified for order ${order.orderId} → Delivered`);
    }

    // Push notification to customer
    const freshUser = await User.findById(order.user._id || order.user).lean();
    if (freshUser) {
      await notifyUser({
        userId: freshUser._id,
        type:   "ORDER",
        pushData: {
          title:    "Order Delivered 🎉",
          body:     "Your order has been delivered. Enjoy your fresh groceries!",
          imageUrl: "https://api.freshlaa.com/assets/order-delivered.png",
          data: {
            screen:  "OrderTracking",
            orderId: order._id.toString(),
            status:  "Delivered",
          },
        },
      });
    }

    // ── WhatsApp NOT sent here ─────────────────────────────────────────────
    // order_delivered WhatsApp template is sent exclusively from
    // updateOrderStatus to avoid duplicate messages.

    return res.json({
      success: true,
      message: "OTP verified. Order marked as Delivered.",
      order,
    });

  } catch (error) {
    console.error("❌ VERIFY OTP ERROR:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN — UPDATE ORDER STATUS
═══════════════════════════════════════════════════════════════ */

exports.updateOrderStatus = async (req, res) => {
  try {
    const isAdmin = !!req.admin || !!req.user?.isAdmin;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { orderId, status, reason } = req.body;

    const allowedStatuses = ["Placed", "Packed", "OutForDelivery", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(orderId).populate("user");
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.status === status) {
      return res.json({ success: true, message: "Status already set", order });
    }

    order.status = status;
    if (status === "Cancelled") {
      order.cancellationReason = reason || "Cancelled by admin";
      order.cancelledAt        = new Date();
    }

    // ✅ Auto-generate OTP when order goes OutForDelivery
    if (status === "OutForDelivery") {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      order.deliveryOTP       = otp;
      order.otpGeneratedAt    = new Date();
      order.otpFailedAttempts = 0;
    }

    await order.save();

    // ✅ Push OTP to customer AFTER save
    if (status === "OutForDelivery" && order.deliveryOTP && global.io) {
      global.io.to(order._id.toString()).emit("delivery-otp-generated", {
        orderId: order._id.toString(),
        otp:     order.deliveryOTP,
      });
      console.log(`🔐 OTP auto-generated for ${order.orderId}: ${order.deliveryOTP}`);
    }

    /* ── Socket ── */
    if (global.io) {
      const roomId = order._id.toString();
      const msg    = STATUS_MESSAGES[status];
      global.io.to(roomId).emit("order-status-updated", {
        orderId:   roomId,
        status,
        title:     msg?.title   || "Order Update",
        message:   msg?.body    || `Your order is now ${status}`,
        updatedAt: new Date().toISOString(),
      });
      console.log(`📡 Socket emitted to room [${roomId}]: ${status}`);
    }

    /* ── Push notification ── */
    const msg = STATUS_MESSAGES[status];
    if (msg) {
      try {
        const freshUser = await User.findById(order.user._id).lean();

        console.log("🔔 NOTIFY DEBUG:", {
          userId:    freshUser?._id?.toString(),
          fcmToken:  freshUser?.fcmToken      ? `✅ ${freshUser.fcmToken.slice(0, 30)}...`      : "❌ MISSING",
          expoToken: freshUser?.expoPushToken ? `✅ ${freshUser.expoPushToken.slice(0, 30)}...` : "❌ MISSING",
        });

        await notifyUser({
          userId:   freshUser._id,
          type:     "ORDER",
          pushData: {
            ...msg,
            data: {
              screen:  "OrderTracking",
              orderId: order._id.toString(),
              status,
            },
          },
        });

        console.log(`✅ Push sent for order ${order.orderId || order._id} → ${status}`);
      } catch (notifyErr) {
        console.error("❌ notifyUser failed:", notifyErr.message);
        console.error("❌ notifyUser stack:", notifyErr.stack);
      }
    }

    /* ── WhatsApp ── */
    const phone = order.user?.phone?.replace("+", "");

    if (status === "Cancelled" && phone) {
      sendWhatsAppTemplate(phone, "order_cancelled", [
        order.user.name || "Customer",
        "Freshlaa",
        order.orderId || order._id.toString(),
      ]).catch((err) => console.error("WhatsApp order_cancelled error:", err.message));
    }

    // ✅ FIXED: order_delivered WhatsApp — single source of truth
    if (status === "Delivered" && phone) {
      try {
        await generateInvoice(order, order.user);

        // Build productName: "Item1 + X more" for multiple items, else first item name
        const productName =
          order.items.length > 1
            ? `${order.items[0].name} + ${order.items.length - 1} more`
            : order.items[0]?.name || "Freshlaa Items";

        // ✅ Exactly 4 params: [name, orderId, productName, amount]
        // ✅ Uses order.user?.name (not freshUser which is scoped inside the push block above)
        await sendWhatsAppTemplate(phone, "order_delivered", [
          order.user?.name || "Customer",
          order.orderId || order._id.toString(),
          productName,
          order.total.toString(),
        ]);

        const invoiceUrl = `https://api.freshlaa.com/invoices/invoice-${order._id}.pdf`;
        await sendWhatsAppDocument(phone, invoiceUrl, `Invoice-${order._id}.pdf`);
      } catch (err) {
        console.error("Invoice/WhatsApp delivered error:", err.message);
      }
    }

    return res.json({ success: true, message: "Order status updated", order });

  } catch (error) {
    console.error("❌ UPDATE ORDER STATUS ERROR:", error.message);
    console.error("❌ STACK:", error.stack);
    return res.status(500).json({ success: false, message: error.message });
  }
};