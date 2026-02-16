const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

const {
  createOrder,
  verifyPayment,
  razorpayWebhook,   // 🔥 NEW
} = require("../controllers/razorpay.controller");

/* ROUTES */
router.post("/create", auth, createOrder);
router.post("/verify", auth, verifyPayment);

// 🔥 Webhook must NOT use auth
router.post("/webhook", express.json({ type: "*/*" }), razorpayWebhook);

module.exports = router;