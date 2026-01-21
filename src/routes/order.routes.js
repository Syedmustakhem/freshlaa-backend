const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const admin = require("../middlewares/adminAuth"); // if you have

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
} = require("../controllers/order.controller");

router.post("/", protect, createOrder);
router.get("/", protect, getMyOrders);
router.get("/:id", protect, getOrderById);

/* ✅ USER */
router.put("/:id/cancel", protect, cancelOrder);

/* ✅ ADMIN */
router.put("/admin/:id/status", protect, admin, updateOrderStatus);

module.exports = router;
