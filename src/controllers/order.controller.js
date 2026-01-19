const Order = require("../models/Order");

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
    const normalizedItems = items.map((item) => ({
      productId: item.productId || item._id || "",
      name:
        item.name ||
        item.title ||
        item.selectedVariant?.label ||
        "Item",
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

/* ================= ADMIN: UPDATE STATUS ================= */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatus = [
      "Placed",
      "Packed",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
