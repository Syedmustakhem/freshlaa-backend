const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { notifyUser } = require("../services/notification.service");
const { sendWhatsAppTemplate, sendWhatsAppDocument } = require("../services/whatsapp.service");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { calculateOrder } = require("../services/pricing.service");
const AdminPush = require("../models/AdminPush");
const webpush = require("web-push");
const checkoutService = require("../services/checkoutPayment.service");
const generateInvoice = require("../utils/generateInvoice");
const HotelMenuItem = require("../models/HotelMenuItem");

/* ═══════════════════════════════════════════════════════════════
   ENV SAFETY
═══════════════════════════════════════════════════════════════ */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay keys missing in env");
}

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

try {
  webpush.setVapidDetails(
    "mailto:support@freshlaa.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error("VAPID Config Error:", err.message);
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

// ✅ FIX 5: added all tomorrow slots
function calculateScheduledTime(slot) {
  const now = new Date();

  // Helper to build a Date for tomorrow at a given hour (IST → UTC)
  const tomorrowAt = (hourIST) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    // IST is UTC+5:30 — subtract 5.5 hrs to store as UTC
    d.setHours(hourIST - 5, 30, 0, 0);
    return d;
  };

  switch (slot) {
    case "30m":          return new Date(now.getTime() + 30 * 60 * 1000);
    case "1h":           return new Date(now.getTime() + 60 * 60 * 1000);
    case "5h":           return new Date(now.getTime() + 5  * 60 * 60 * 1000);
    case "12h":          return new Date(now.getTime() + 12 * 60 * 60 * 1000);
    case "1d":           return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "tmr_morning":  return tomorrowAt(8);   // Tomorrow 8 AM IST
    case "tmr_afternoon":return tomorrowAt(12);  // Tomorrow 12 PM IST
    case "tmr_evening":  return tomorrowAt(17);  // Tomorrow 5 PM IST
    default:             return null;
  }
}

// ✅ FIX 4: updated to include all tomorrow slots
const ALLOWED_SLOTS = [
  "30m", "1h", "5h", "12h", "1d",
  "tmr_morning", "tmr_afternoon", "tmr_evening",
];

// ✅ FIX 12: batch product lookup — one query for all items instead of N queries
async function buildFormattedItems(validatedItems) {
  // Separate by model type
  const productIds     = [];
  const hotelItemIds   = [];

  for (const i of validatedItems) {
    if (i.itemModel === "HotelMenuItem") hotelItemIds.push(i.productId);
    else                                  productIds.push(i.productId);
  }

  // Two batched queries instead of one-per-item
  const [products, hotelItems] = await Promise.all([
    productIds.length   ? Product.find({ _id: { $in: productIds } }).lean()   : [],
    hotelItemIds.length ? HotelMenuItem.find({ _id: { $in: hotelItemIds } }).lean() : [],
  ]);

  const productMap = Object.fromEntries(
    [...products, ...hotelItems].map((p) => [p._id.toString(), p])
  );

  // ✅ FIX 1 & 2: use i.productId (not i.product), include all required schema fields
  return validatedItems.map((i) => {
    const product = productMap[i.productId?.toString()];
    return {
      productId:         i.productId,
      name:              product?.name          || "Product",
      image:             product?.image         || "",
      originalPrice:     i.originalPrice        ?? i.price,   // ✅ FIX 2: both price fields
      finalPrice:        i.finalPrice           ?? i.price,
      qty:               i.qty,
      itemModel:         i.itemModel            || "Product",
      isCampaignProduct: i.isCampaignProduct    || false,
      variant: i.variantId ? {
        key:   i.variantId,
        label: i.variantLabel || "",
        price: i.price,
      } : undefined,
      selectedAddons:    i.selectedAddons       || [],
      customizations:    i.customizations       || {},
      hotelId:           i.hotelId              || undefined,
    };
  });
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

    res.json({ success: true, ...result });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   CREATE ORDER
═══════════════════════════════════════════════════════════════ */

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      items,
      address,
      paymentMethod,
      payment,
      couponCode,
      deliveryType,
      deliverySlot,
      // ✅ FIX 3: destructure new fields
      orderForSomeone,
      recipient,
      deliveryInstructions,
    } = req.body;

    /* ── Basic validation ── */
    if (!Array.isArray(items) || !items.length)
      throw new Error("No items in order");

    if (!address || typeof address !== "object")
      throw new Error("Address missing");

    if (!address.pincode)
      throw new Error("Address pincode is required");

    const allowedMethods = ["COD", "ONLINE"];
    if (!allowedMethods.includes(paymentMethod || "COD"))
      throw new Error("Invalid payment method");

    /* ── Delivery validation ── */
    // ✅ FIX 4: allowedSlots now includes tomorrow slots
    let scheduledTime = null;

    if (deliveryType === "scheduled") {
      if (!ALLOWED_SLOTS.includes(deliverySlot))
        throw new Error("Invalid delivery slot");

      scheduledTime = calculateScheduledTime(deliverySlot);

      if (!scheduledTime)
        throw new Error("Could not resolve scheduled time for slot: " + deliverySlot);

      if (scheduledTime < new Date())
        throw new Error("Scheduled time cannot be in the past");
    }

    /* ── Recipient validation (order for someone else) ── */
    if (orderForSomeone) {
      if (!recipient?.name?.trim())
        throw new Error("Recipient name is required");
      if (!/^[6-9]\d{9}$/.test(recipient?.phone?.trim() || ""))
        throw new Error("Invalid recipient phone number");
    }

    /* ── Pricing ── */
    const result = await calculateOrder(items, session, couponCode);

    /* ── Payment method check ── */
    const methods = await checkoutService.getCheckoutPaymentOptions({
      userId: req.user._id,
      amount: result?.grandTotal || 0,
    });

    const selectedMethod = methods.find((m) => m.id === (paymentMethod || "COD"));
    if (!selectedMethod || !selectedMethod.enabled) {
      throw new Error(selectedMethod?.reason || "Selected payment method not allowed");
    }

    // ✅ FIX 6: apply COD fee to grand total if applicable
    const codFee = selectedMethod.codFee ?? 0;
    if (codFee > 0) {
      result.grandTotal += codFee;
      result.codFee      = codFee;
    }

    /* ── Online payment verification ── */
    let paymentStatus = "Pending";
    let razorpayData  = null;

    if (paymentMethod === "ONLINE") {
      if (!payment?.razorpay_order_id || !payment?.razorpay_payment_id || !payment?.razorpay_signature)
        throw new Error("Payment data missing");

      // Idempotency check
      const existingOrder = await Order.findOne({
        "paymentDetails.razorpay_payment_id": payment.razorpay_payment_id,
      });
      if (existingOrder) throw new Error("Duplicate order detected");

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(payment.razorpay_order_id + "|" + payment.razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== payment.razorpay_signature)
        throw new Error("Payment verification failed");

      paymentStatus = "Paid";
      razorpayData  = payment;
    }

    /* ── Build items with batched DB lookup ── */
    // ✅ FIX 12: no N+1 — single batched query
    const formattedItems = await buildFormattedItems(result.validatedItems);

    /* ── Create order ── */
    const orderDoc = await Order.create(
      [
        {
          user:          req.user._id,
          items:         formattedItems,
          address,
          deliveryType:  deliveryType  || "instant",
          deliverySlot:  deliverySlot  || null,
          scheduledTime,

          // ✅ FIX 3: save new feature fields
          isGiftOrder:          !!orderForSomeone,
          recipient:            orderForSomeone ? {
            name:  recipient.name.trim(),
            phone: recipient.phone.trim(),
            note:  recipient.note?.trim() || "",
          } : null,
          deliveryInstructions: deliveryInstructions || {},

          paymentMethod:  paymentMethod || "COD",
          paymentStatus,
          paymentDetails: razorpayData,

          // ✅ FIX 3: save couponCode and full pricing breakdown
          couponCode: couponCode || null,
          pricing: {
            itemsTotal:       result.itemsTotal       ?? 0,
            deliveryFee:      result.deliveryFee      ?? 0,
            handlingFee:      result.handlingFee      ?? 0,
            codFee:           result.codFee           ?? 0,  // ✅ FIX 6: codFee in breakdown
            couponDiscount:   result.couponDiscount   ?? 0,
            campaignDiscount: result.campaignDiscount ?? 0,
            totalSavings:     result.totalSavings     ?? 0,
            grandTotal:       result.grandTotal,
          },

          total:  result.grandTotal, // kept for backwards compat
          status: "Placed",
        },
      ],
      { session }
    );

    const order = orderDoc[0];

    await session.commitTransaction();

    /* ── Post-commit side effects ── */
    const user = await User.findById(req.user._id).lean();

    // Socket
    if (global.io) {
      global.io.emit("new-order", {
        orderId: order._id.toString(),
        total:   order.total,
        items:   order.items.length,
      });
    }

    // Admin web push
    try {
      const subs    = await AdminPush.find().select("subscription");
      const payload = JSON.stringify({
        title: "🛒 New Order",
        body:  `₹${order.total} order placed`,
        data:  { orderId: order._id.toString() },
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(s.subscription, payload);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await AdminPush.deleteOne({ _id: s._id });
          }
        }
      }
    } catch (err) {
      console.error("Admin Push Error:", err.message);
    }

    // Expo push to user
    await notifyUser({
      userId:   user._id,
      type:     "ORDER",
      pushData: {
        title:    "Order Placed 🛒",
        body:     `Your order of ₹${order.total} has been placed`,
        imageUrl: "https://api.freshlaa.com/assets/order-placed.png",
        data:     { screen: "OrderTracking", orderId: order._id.toString() },
      },
    });

    // ✅ FIX 10: WhatsApp only sent here in createOrder — NOT again in updateOrderStatus
    if (user?.phone) {
      try {
        await sendWhatsAppTemplate(
          user.phone.replace("+", ""),
          "order_placed",
          [
            user.name || "Customer",
            "Freshlaa Grocery",
            order._id.toString(),
            `₹${order.total}`,
          ]
        );
      } catch (err) {
        console.error("WhatsApp Error:", err.message);
      }
    }

    res.status(201).json({ success: true, order });

  } catch (error) {
    // ✅ FIX 7: always abort + end session in finally
    if (session.inTransaction()) await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/* ═══════════════════════════════════════════════════════════════
   CANCEL ORDER
═══════════════════════════════════════════════════════════════ */

exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Access denied" });

    // ✅ FIX 9: block cancellation once out for delivery
    const nonCancellable = ["Delivered", "Cancelled", "OutForDelivery"];
    if (nonCancellable.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is ${order.status}`,
      });
    }

    /* ── Refund if paid online ── */
    if (
      order.paymentMethod === "ONLINE" &&
      order.paymentStatus === "Paid"   &&
      order.paymentDetails?.razorpay_payment_id
    ) {
      if (order.refundStatus === "Initiated" || order.paymentStatus === "Refunded")
        throw new Error("Refund already initiated or processed");

      // ✅ FIX 8: Math.round to avoid floating point issues with Razorpay
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
      let product = await Product.findById(item.productId).session(session);
      if (!product) product = await HotelMenuItem.findById(item.productId).session(session);
      if (!product) continue;

      if (item.variant?.key && product.variants?.length) {
        const variant = product.variants.id(item.variant.key);
        if (variant) variant.stock += item.qty;
      } else {
        product.stock += item.qty;
      }

      await product.save({ session });
    }

    // ✅ Store cancellation metadata
    order.status             = "Cancelled";
    order.cancellationReason = req.body.reason || null;
    order.cancelledAt        = new Date();
    await order.save({ session });

    await session.commitTransaction();

    res.json({ success: true, message: "Order cancelled", order });

  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    // ✅ FIX 7: always runs
    session.endSession();
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET MY ORDERS
═══════════════════════════════════════════════════════════════ */

// ✅ FIX 11: paginated
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
        .lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + orders.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN — UPDATE ORDER STATUS
═══════════════════════════════════════════════════════════════ */

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    // ✅ FIX 6: admin-only guard — attach isAdmin via your auth middleware,
    // or add a dedicated adminAuth middleware on the route. Belt-and-suspenders
    // check here catches any route misconfiguration.
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const allowedStatuses = ["Placed", "Packed", "OutForDelivery", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const order = await Order.findById(orderId).populate("user");
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    // Idempotency — skip if already at this status
    if (order.status === status) {
      return res.json({ success: true, message: "Status already set", order });
    }

    order.status = status;

    // Track cancellation metadata when admin cancels
    if (status === "Cancelled") {
      order.cancellationReason = req.body.reason || "Cancelled by admin";
      order.cancelledAt        = new Date();
    }

    await order.save();

    /* ── Socket ── */
    if (global.io) {
      global.io.emit("order-updated", { orderId: order._id.toString(), status });
    }

    /* ── Push notifications ── */
    const statusMessages = {
      Placed:         { title: "Order Confirmed 🛒",   body: "Your order has been confirmed!",   imageUrl: "https://api.freshlaa.com/assets/order-placed.png"    },
      Packed:         { title: "Order Packed 📦",      body: "Your order is packed and ready!",  imageUrl: "https://api.freshlaa.com/assets/order-packed.png"    },
      OutForDelivery: { title: "Out for Delivery 🛵",  body: "Your order is on the way!",        imageUrl: "https://api.freshlaa.com/assets/order-delivery.png"  },
      Delivered:      { title: "Order Delivered 🎉",   body: "Enjoy your order! Rate us ⭐",     imageUrl: "https://api.freshlaa.com/assets/order-delivered.png" },
      Cancelled:      { title: "Order Cancelled ❌",   body: "Your order has been cancelled.",   imageUrl: "https://api.freshlaa.com/assets/order-cancelled.png" },
    };

    const msg = statusMessages[status];
    if (msg) {
      await notifyUser({
        userId:   order.user._id,
        type:     "ORDER",
        pushData: {
          title:    msg.title,
          body:     msg.body,
          imageUrl: msg.imageUrl,
          data:     { screen: "OrderTracking", orderId: order._id.toString() },
        },
      });
    }

    /* ── WhatsApp ── */
    // ✅ FIX 10: removed "Placed" from here — it's only sent in createOrder
    const phone = order.user?.phone?.replace("+", "");

    if (status === "Cancelled" && phone) {
      try {
        await sendWhatsAppTemplate(phone, "order_cancelled", [
          order.user.name || "Customer",
          "Freshlaa",
          order._id.toString(),
        ]);
      } catch (err) {
        console.error("WhatsApp cancel error:", err.message);
      }
    }

    if (status === "Delivered" && phone) {
      try {
        const user = order.user;

        await generateInvoice(order, user);

        await sendWhatsAppTemplate(phone, "order_delivered", [
          user.name || "Customer",
          order._id.toString(),
          `₹${order.total}`,
        ]);

        const invoiceUrl = `https://api.freshlaa.com/invoices/invoice-${order._id}.pdf`;
        await sendWhatsAppDocument(phone, invoiceUrl, `Invoice-${order._id}.pdf`);

        console.log("✅ Invoice sent:", invoiceUrl);
      } catch (err) {
        console.error("Invoice/WhatsApp error:", err.message);
      }
    }

    res.json({ success: true, message: "Order updated", order });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};