const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const admin = require("../middlewares/adminAuth");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getLastOrder,
  getActiveOrder,
} = require("../controllers/order.controller");

/* ================= ADMIN ROUTES ================= */
router.put("/admin/:id/status", protect, admin, updateOrderStatus);

/* ================= USER ROUTES ================= */
router.post("/", protect, createOrder);
router.get("/", protect, getMyOrders);

// 🔥 IMPORTANT: Put specific routes BEFORE :id
router.get("/last", protect, getLastOrder);
router.get("/active", protect, getActiveOrders);

router.get("/:id", protect, getOrderById);
router.put("/:id/cancel", protect, cancelOrder);

module.exports = router;
