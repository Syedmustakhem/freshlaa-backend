// src/controllers/rider.controller.js
const jwt   = require("jsonwebtoken");
const Rider = require("../models/Rider");
const Order = require("../models/Order");
const User  = require("../models/User");
const { notifyUser } = require("../services/notification.service");
const { sendWhatsAppTemplate, sendWhatsAppDocument } = require("../services/whatsapp.service");
const generateInvoice = require("../utils/generateInvoice");

const EARNING_PER_DELIVERY = 30; // ₹30 per delivery — change as needed

// ── Generate JWT for rider ────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id, role: "rider" }, process.env.JWT_SECRET, { expiresIn: "7d" });

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */

// POST /api/rider/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const rider = await Rider.findOne({ email });
    if (!rider || !(await rider.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!rider.isActive)
      return res.status(403).json({ success: false, message: "Account deactivated. Contact admin." });

    if (!rider.isApproved)
      return res.status(403).json({ success: false, message: "Account pending approval. Contact admin." });

    const token = signToken(rider._id);
    return res.json({
      success: true,
      token,
      rider: {
        _id:      rider._id,
        name:     rider.name,
        email:    rider.email,
        phone:    rider.phone,
        avatar:   rider.avatar,
        isOnline: rider.isOnline,
        earnings: rider.earnings,
        stats:    rider.stats,
      },
    });
  } catch (err) {
    console.error("❌ RIDER LOGIN ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rider/me
exports.getMe = async (req, res) => {
  try {
    const rider = await Rider.findById(req.rider._id)
      .select("-password")
      .populate("currentOrderId");
    return res.json({ success: true, rider });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   ONLINE / OFFLINE TOGGLE
═══════════════════════════════════════════════════════════ */

// PUT /api/rider/online
exports.toggleOnline = async (req, res) => {
  try {
    const rider = await Rider.findById(req.rider._id);
    rider.isOnline = !rider.isOnline;
    await rider.save();

    // Emit to admin panel
    if (global.io) {
      global.io.to("support_agents").emit("rider-status", {
        riderId:  rider._id,
        name:     rider.name,
        isOnline: rider.isOnline,
      });
    }

    return res.json({ success: true, isOnline: rider.isOnline });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   LOCATION UPDATE
═══════════════════════════════════════════════════════════ */

// PUT /api/rider/location  { lat, lng }
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Rider.findByIdAndUpdate(req.rider._id, {
      "location.lat":       lat,
      "location.lng":       lng,
      "location.updatedAt": new Date(),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   ORDERS
═══════════════════════════════════════════════════════════ */

// GET /api/rider/orders  — orders assigned to this rider OR OutForDelivery
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["OutForDelivery", "Delivered"] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rider/orders/active  — only OutForDelivery
exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: "OutForDelivery" })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rider/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   OTP VERIFY  (rider confirms delivery)
═══════════════════════════════════════════════════════════ */

// POST /api/rider/orders/:id/verify-otp  { otp }
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp?.trim())
      return res.status(400).json({ success: false, message: "OTP is required" });

    const order = await Order.findById(req.params.id).populate("user");
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.status !== "OutForDelivery")
      return res.status(400).json({ success: false, message: `Cannot verify OTP — status: ${order.status}` });

    if (order.otpVerified)
      return res.status(400).json({ success: false, message: "OTP already verified" });

    if ((order.otpFailedAttempts || 0) >= 5)
      return res.status(429).json({ success: false, message: "Too many wrong attempts. Contact admin.", code: "OTP_LOCKED" });

    // Wrong OTP
    if (order.deliveryOTP !== otp.trim()) {
      order.otpFailedAttempts = (order.otpFailedAttempts || 0) + 1;
      await order.save();
      const remaining = Math.max(0, 5 - order.otpFailedAttempts);
      return res.status(400).json({
        success: false, code: "OTP_WRONG",
        message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
        attemptsLeft: remaining,
      });
    }

    // ✅ Correct OTP — mark delivered
    order.status      = "Delivered";
    order.otpVerified = true;
    await order.save();

    // Update rider earnings + stats
    const rider = await Rider.findById(req.rider._id);
    if (rider) {
      rider.earnings.today  = (rider.earnings.today  || 0) + EARNING_PER_DELIVERY;
      rider.earnings.week   = (rider.earnings.week   || 0) + EARNING_PER_DELIVERY;
      rider.earnings.month  = (rider.earnings.month  || 0) + EARNING_PER_DELIVERY;
      rider.earnings.total  = (rider.earnings.total  || 0) + EARNING_PER_DELIVERY;
      rider.stats.totalDeliveries = (rider.stats.totalDeliveries || 0) + 1;
      rider.stats.todayDeliveries = (rider.stats.todayDeliveries || 0) + 1;
      rider.currentOrderId = null;
      rider.deliveryHistory.push({
        orderId:     order._id,
        amount:      order.total,
        deliveredAt: new Date(),
        earning:     EARNING_PER_DELIVERY,
      });
      await rider.save();
    }

    // Notify customer via socket
    if (global.io) {
      const roomId = order._id.toString();
      global.io.to(roomId).emit("order-status-updated", {
        orderId: roomId, status: "Delivered",
        title:   "Order Delivered 🎉",
        message: "Your order has been delivered. Enjoy!",
        updatedAt: new Date().toISOString(),
      });
      global.io.to(roomId).emit("otp-verified", { orderId: roomId, status: "Delivered" });
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
          data:     { screen: "OrderTracking", orderId: order._id.toString(), status: "Delivered" },
        },
      });
    }

    // WhatsApp + invoice
    const phone = (freshUser?.phone || order.user?.phone)?.replace("+", "");
    if (phone) {
      (async () => {
        try {
          await generateInvoice(order, order.user);
          await sendWhatsAppTemplate(phone, "order_delivered", [
            freshUser?.name || "Customer",
            order.orderId || order._id.toString(),
            `₹${order.total}`,
          ]);
          const invoiceUrl = `https://api.freshlaa.com/invoices/invoice-${order._id}.pdf`;
          await sendWhatsAppDocument(phone, invoiceUrl, `Invoice-${order._id}.pdf`);
        } catch (err) {
          console.error("WhatsApp/invoice error:", err.message);
        }
      })();
    }

    return res.json({ success: true, message: "OTP verified. Order marked as Delivered.", order });
  } catch (err) {
    console.error("❌ RIDER VERIFY OTP ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   EARNINGS
═══════════════════════════════════════════════════════════ */

// GET /api/rider/earnings
exports.getEarnings = async (req, res) => {
  try {
    const rider = await Rider.findById(req.rider._id).select("earnings stats deliveryHistory");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    // Last 10 deliveries
    const recent = rider.deliveryHistory
      .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))
      .slice(0, 10);

    return res.json({
      success: true,
      earnings: rider.earnings,
      stats:    rider.stats,
      recent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   ADMIN — Create / manage riders
═══════════════════════════════════════════════════════════ */

// POST /api/rider/admin/create  { name, email, password, phone }
exports.adminCreateRider = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone)
      return res.status(400).json({ success: false, message: "All fields required" });

    const existing = await Rider.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const rider = await Rider.create({ name, email, password, phone, isApproved: true });
    return res.status(201).json({ success: true, rider });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rider/admin/all
exports.adminGetRiders = async (req, res) => {
  try {
    const riders = await Rider.find().select("-password -deliveryHistory").lean();
    return res.json({ success: true, riders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rider/admin/:id/approve
exports.adminApproveRider = async (req, res) => {
  try {
    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).select("-password");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });
    return res.json({ success: true, rider });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};