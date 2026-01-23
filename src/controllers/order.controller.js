const Order = require("../models/Order");
const sendPush = require("../utils/sendPush");
const User = require("../models/User");
/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  try {
    const { items, address, paymentMethod, total } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in order",
      });
    }

    if (!address || typeof address !== "object") {
      return res.status(400).json({
        success: false,
        message: "Address missing",
      });
    }

    if (!total || total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid total",
      });
    }

    /* 🔥 NORMALIZE ITEMS (THIS FIXES COD) */
    /* 🔥 NORMALIZE ITEMS (FIXES IMAGES + COD) */
const normalizedItems = items.map((item) => ({
  productId: item.productId || item._id || "",
  name:
    item.name ||
    item.title ||
    item.selectedVariant?.label ||
    "Item",

  image:
    item.image ||                 // ✅ from cart
    item.thumbnail ||             // fallback
    item.images?.[0] ||            // fallback
    "",

  price: Number(item.price || item.finalPrice || 0),
  qty: Number(item.qty || 1),
}));


    const order = await Order.create({
      user: req.user._id,
      items: normalizedItems,
      address,
      paymentMethod: paymentMethod || "COD",
      total,
      status: "Placed",
    });

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order",
    });
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
