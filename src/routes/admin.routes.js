const express = require("express");
const router = express.Router();

const { adminLogin } = require("../controllers/admin/Adminauth.controller");
const { createInitialAdmin } = require("../controllers/admin/initAdmin.controller");
const { getDashboardMetrics } = require("../controllers/admin/dashboard.controller");

const adminAuth = require("../middlewares/adminAuth");
const User = require("../models/User");
const Address = require("../models/Address");
const Order = require("../models/Order");


/* ================= ADMIN SETUP ================= */

/* TEMP – USE ONCE */
router.post("/init", createInitialAdmin);

/* LOGIN */
router.post("/login", adminLogin);
router.get("/dashboard", adminAuth, getDashboardMetrics);

/* ================= USERS (ADMIN PANEL) ================= */
/**
 * GET /api/admin/users/:id
 * User profile details
 */
router.get("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -otp")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("ADMIN USER DETAILS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load user details",
    });
  }
});
/**
 * PATCH /api/admin/users/:id/status
 * Block / Unblock user
 */
router.patch("/users/:id/status", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? "unblocked" : "blocked"} successfully`,
      data: {
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("USER STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
});
/**
 * GET /api/admin/users/:id/addresses
 */
router.get("/users/:id/addresses", adminAuth, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.params.id }).lean();

    res.json({
      success: true,
      data: addresses,
    });
  } catch (err) {
    console.error("ADMIN USER ADDRESSES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load addresses",
    });
  }
});

/**
 * GET /api/admin/users/:id/orders
 */
router.get("/users/:id/orders", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    console.error("ADMIN USER ORDERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load orders",
    });
  }
});
/**
 * GET /api/admin/users/:id/cart
 */
router.get("/users/:id/cart", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("cart.productId")
      .lean();

    res.json({
      success: true,
      data: user?.cart || [],
    });
  } catch (err) {
    console.error("ADMIN USER CART ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load cart",
    });
  }
});

router.get("/users", adminAuth, async (req, res) => {
  try {
    const { search = "", status } = req.query;

    const query = {};

    // Search by name / phone / email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status === "active") query.isActive = true;
    if (status === "blocked") query.isActive = false;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password -otp")
      .lean();

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});

module.exports = router;
