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
      image:             product?.image      || "",
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
   NOTE: Transactions removed — MongoDB M0 free tier does not
   support multi-document transactions. Upgrade to M2+ to re-enable.
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
      if (!scheduledTime)         throw new Error("Could not resolve delivery time for slot: " + deliverySlot);
      if (scheduledTime < new Date()) throw new Error("Scheduled time cannot be in the past");
    }

    /* ── Recipient validation ── */
    if (orderForSomeone) {
      if (!recipient?.name?.trim())
        throw new Error("Recipient name is required");
      if (!/^[6-9]\d{9}$/.test(recipient?.phone?.trim() || ""))
        throw new Error("Invalid recipient phone number");
    }

    /* ── Pricing — pass null for session (no transactions on M0) ── */
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

    /* ── Apply COD fee if any ── */
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

      // Idempotency — reject duplicate payments
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

    /* ── Persist order ── */
    const order = await Order.create({
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

    /* ── Post-save side effects (non-blocking) ── */
    const user = await User.findById(req.user._id).lean();

    // Socket
    if (global.io) {
      global.io.emit("new-order", {
        orderId: order._id.toString(),
        total:   order.total,
        items:   order.items.length,
      });
    }

    // Admin push
    notifyAdmins({
      title: "🛒 New Order",
      body:  `₹${order.total} order placed`,
      data:  { orderId: order._id.toString() },
    });

    // User push
    notifyUser({
      userId:   user._id,
      type:     "ORDER",
      pushData: {
        title:    "Order Placed 🛒",
        body:     `Your order of ₹${order.total} has been placed`,
        imageUrl: "https://api.freshlaa.com/assets/order-placed.png",
        data:     { screen: "OrderTracking", orderId: order._id.toString() },
      },
    });

    // WhatsApp
    if (user?.phone) {
      sendWhatsAppTemplate(
        user.phone.replace("+", ""),
        "order_placed",
        [user.name || "Customer", "Freshlaa Grocery", order._id.toString(), `₹${order.total}`]
      ).catch((err) => console.error("WhatsApp order_placed error:", err.message));
    }

    return res.status(201).json({ success: true, order });

} catch (error) {
    console.error("❌ CREATE ORDER ERROR:", error.message);
    console.error("❌ STACK:", error.stack); // ← ADD THIS ONE LINE
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   CANCEL ORDER
   NOTE: Transactions removed — M0 free tier limitation.
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

    /* ── Refund if paid online ── */
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

    /* ── Restore stock ── */
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
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
   ADMIN — UPDATE ORDER STATUS
═══════════════════════════════════════════════════════════════ */

// ─── REPLACE exports.updateOrderStatus in your order.controller.js ───────────
// Only this function changes. Everything else stays the same.

exports.updateOrderStatus = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { orderId, status, reason } = req.body;

    const allowedStatuses = ["Placed", "Confirmed", "Packed", "OutForDelivery", "Delivered", "Cancelled"];
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

    await order.save();

    /* ── Socket: emit ONLY to this order's room, not everyone ── */
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

    /* ── Push notification (FCM → Expo fallback already in notifyUser) ── */
    const msg = STATUS_MESSAGES[status];
    if (msg) {
      notifyUser({
        userId:   order.user._id,
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
    }

    /* ── WhatsApp ── */
    const phone = order.user?.phone?.replace("+", "");

    if (status === "Cancelled" && phone) {
      sendWhatsAppTemplate(phone, "order_cancelled", [
        order.user.name || "Customer",
        "Freshlaa",
        order._id.toString(),
      ]).catch((err) => console.error("WhatsApp order_cancelled error:", err.message));
    }

    if (status === "Delivered" && phone) {
      (async () => {
        try {
          await generateInvoice(order, order.user);
          await sendWhatsAppTemplate(phone, "order_delivered", [
            order.user.name || "Customer",
            order._id.toString(),
            `₹${order.total}`,
          ]);
          const invoiceUrl = `https://api.freshlaa.com/invoices/invoice-${order._id}.pdf`;
          await sendWhatsAppDocument(phone, invoiceUrl, `Invoice-${order._id}.pdf`);
        } catch (err) {
          console.error("Invoice/WhatsApp delivered error:", err.message);
        }
      })();
    }

    return res.json({ success: true, message: "Order status updated", order });

  } catch (error) {
    console.error("❌ UPDATE ORDER STATUS ERROR:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};