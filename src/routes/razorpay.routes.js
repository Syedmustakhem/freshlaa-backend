const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

const {
  createOrder,
  verifyPayment,
} = require("../controllers/razorpay.controller");

/* ROUTES */
router.post("/create", auth, createOrder);
router.post("/verify", auth, verifyPayment);

module.exports = router;
