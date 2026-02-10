// TOP IMPORTS
const Order = require("../models/Order");
const User = require("../models/User");
const sendPush = require("../utils/sendPush");

const AdminPush = require("../models/AdminPush");
const webpush = require("web-push");

// VAPID CONFIG (ONCE)
webpush.setVapidDetails(
  "mailto:support@freshlaa.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      paymentMethod,
      total,
      payment, // 👈 Razorpay payload (for ONLINE)
    } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: "No items in order" });
    }

    if (!address || typeof address !== "object") {
      return res.status(400).json({ success: false, message: "Address missing" });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ success: false, message: "Invalid total" });
    }

    const normalizedItems = items.map((item) => ({
      productId: item.productId || item._id || "",
      name: item.name || item.title || "Item",
      image: item.image || "",
      price: Number(item.price || item.finalPrice || 0),
      qty: Number(item.qty || 1),
    }));

    /* ================= ONLINE PAYMENT VERIFICATION ================= */
    let paymentStatus = "Pending";
    let razorpayData = null;

    if (paymentMethod === "ONLINE") {
      if (
        !payment?.razorpay_payment_id ||
        !payment?.razorpay_order_id ||
        !payment?.razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment verification data missing",
        });
      }

      // 🔐 VERIFY SIGNATURE
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(
          payment.razorpay_order_id + "|" + payment.razorpay_payment_id
        )
        .digest("hex");

      if (expectedSignature !== payment.razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed",
        });
      }

      paymentStatus = "Paid";
      razorpayData = {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      };
    }

    /* ================= CREATE ORDER ================= */
    const order = await Order.create({
      user: req.user._id,
      items: normalizedItems,
      address,
      paymentMethod: paymentMethod || "COD",
      paymentStatus,
      paymentDetails: razorpayData,
      total,
      status: "Placed",
    });

    // 🔥 SOCKET
    global.io.emit("new-order", {
      orderId: order._id,
      total: order.total,
      items: order.items,
      createdAt: order.createdAt,
    });

    // ⚡ RESPOND FAST
    res.status(201).json({ success: true, order });

    /* ================= PUSH NOTIFICATIONS (NON-BLOCKING) ================= */

    // ADMIN PUSH
    try {
      const subs = await AdminPush.find({ endpoint: { $exists: true, $ne: "" } });
      const payload = JSON.stringify({
        title: "🛒 New Order",
        body: `₹${order.total} order placed`,
        image: order.items?.[0]?.image,
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
      console.error("ADMIN PUSH ERROR:", err.message);
    }

    // USER PUSH
    try {
      const user = await User.findById(req.user._id);
      if (user?.expoPushToken) {
        sendPush({
          expoPushToken: user.expoPushToken,
          title: "Order Placed",
          body: `Your order of ₹${order.total} has been placed`,
          data: { orderId: order._id.toString() },
        });
      }
    } catch (err) {
      console.error("USER PUSH ERROR:", err.message);
    }

  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
};


/* ================= GET MY ORDERS ================= */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 }); // 🔥 latest first

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET ORDER BY ID ================= */
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CANCEL ORDER ================= */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered order cannot be cancelled",
      });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled",
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ================= GET LAST ORDER (QUICK REORDER) ================= */
exports.getLastOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* ================= GET ACTIVE ORDER ================= */
exports.getActiveOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      user: req.user._id,
      status: { $nin: ["Delivered", "Cancelled"] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ================= ADMIN: UPDATE ORDER STATUS ================= */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "orderId and status required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ✅ Update status
    order.status = status;
    await order.save();
    if (status === "Delivered") {
  const rewardPoints = Math.floor(order.total * 0.05); // 5% reward

  await User.findByIdAndUpdate(order.user, {
    $inc: { loyaltyPoints: rewardPoints },
  });
}

// 🔥 REALTIME: Notify admin & app about status update
global.io.emit("order-updated", {
  orderId: order._id.toString(),
  status,
});


    // ✅ Respond immediately (IMPORTANT)
    res.json({
      success: true,
      message: "Order status updated",
      order,
    });

    // 🔔 SEND PUSH IN BACKGROUND (NON-BLOCKING)
    try {
      const user = await User.findById(order.user);

      if (user?.expoPushToken) {
        let title = "Order Update";
        let body = "";

        switch (status) {
          case "Placed":
            body = "🛒 Your order has been placed";
            break;
          case "Packed":
            body = "📦 Your order is packed";
            break;
          case "OutForDelivery":
            body = "🚚 Your order is on the way";
            break;
          case "Delivered":
            body = "✅ Order delivered successfully";
            break;
          case "Cancelled":
            body = "❌ Your order was cancelled";
            break;
          default:
            body = `Order status updated to ${status}`;
        }

        sendPush({
          expoPushToken: user.expoPushToken,
          title,
          body,
          data: {
            type: "ORDER_STATUS",
            orderId: order._id.toString(),
            status,
          },
        });
      }
    } catch (pushErr) {
      console.error("PUSH ERROR (IGNORED):", pushErr.message);
    }
  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};
