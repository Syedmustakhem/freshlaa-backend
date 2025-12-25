const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

/* ---------- RAZORPAY INSTANCE ---------- */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ---------- CREATE ORDER ---------- */
router.post("/create", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // ₹ → paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ Razorpay create order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
});

/* ---------- VERIFY PAYMENT ---------- */
router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // ✅ Payment verified
    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("❌ Razorpay verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

module.exports = router;
