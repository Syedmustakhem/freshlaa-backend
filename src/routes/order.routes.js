const express = require("express");
const router  = express.Router();
const protect = require("../middlewares/auth.middleware");
const admin   = require("../middlewares/adminAuth");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getLastOrder,
  getActiveOrders,
  previewCheckout,
  generateDeliveryOTP, // ✅ added
  verifyDeliveryOTP,   // ✅ added
  getTrendingTicker,   // ✅ added
} = require("../controllers/order.controller");

/* ================= ADMIN ROUTES ================= */
router.put("/admin/:id/status",    protect, admin, updateOrderStatus);
router.post("/:id/generate-otp",    admin, generateDeliveryOTP); // ✅ fixed
router.post("/:id/verify-otp",      admin, verifyDeliveryOTP);   // ✅ fixed

/* ================= USER ROUTES ================= */
router.post("/preview", protect, previewCheckout);
router.post("/",        protect, createOrder);
router.get("/",         protect, getMyOrders);

// 🔥 IMPORTANT: specific routes BEFORE :id
router.get("/trending-ticker", getTrendingTicker); // Public route
router.get("/last",   protect, getLastOrder);
router.get("/active", protect, getActiveOrders);

router.get("/:id",         protect, getOrderById);
router.put("/:id/cancel",  protect, cancelOrder);
router.put("/:id/append",  protect, appendItemsToOrder); // ✅ Modification flow

module.exports = router;