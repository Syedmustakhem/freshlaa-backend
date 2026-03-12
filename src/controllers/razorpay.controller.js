const crypto  = require("crypto");
const Order    = require("../models/Order");
const razorpay = require("../utils/razorpay.instance");

/* ─── CREATE RAZORPAY ORDER ────────────────────────────────────────────────
   Called by the frontend before opening the Razorpay checkout sheet.
   Expects: { amount: <number in rupees> }
   Returns: { success, order }
──────────────────────────────────────────────────────────────────────────── */
exports.createOrder = async (req, res) => {
  try {
    const amount = Number(req.body?.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid amount (in rupees) is required",
      });
    }

    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // Razorpay expects paise — round to avoid float issues
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
    });

    return res.json({ success: true, order });

  } catch (error) {
    console.error("Razorpay createOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

/* ─── VERIFY PAYMENT ──────────────────────────────────────────────────────
   Lightweight signature check used immediately after checkout completes.
   Full verification (with idempotency + order update) is re-done inside
   order.controller.js → createOrder before persisting the order.
   Expects: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   Returns: { success }
──────────────────────────────────────────────────────────────────────────── */
exports.verifyPayment = (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required",
      });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed — signature mismatch",
      });
    }

    return res.json({ success: true, message: "Payment verified" });

  } catch (error) {
    console.error("Razorpay verifyPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification error",
    });
  }
};

/* ─── WEBHOOK ──────────────────────────────────────────────────────────────
   IMPORTANT: The route for this handler must use express.raw() middleware,
   NOT express.json(), so req.body is the raw Buffer.

   Example route setup:
     router.post("/webhook", express.raw({ type: "application/json" }), razorpayWebhook);
──────────────────────────────────────────────────────────────────────────── */
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).json({ success: false });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing webhook signature" });
    }

    // req.body must be raw Buffer — validate HMAC before parsing
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (signature !== expected) {
      console.warn("Razorpay webhook: invalid signature");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const payload = JSON.parse(req.body.toString());
    const event   = payload.event;

    /* ── payment.captured ── */
    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;

      await Order.findOneAndUpdate(
        { "paymentDetails.razorpay_payment_id": payment.id },
        { paymentStatus: "Paid" }
      );

      console.log("Webhook: payment.captured —", payment.id);
      return res.json({ success: true });
    }

    /* ── refund.processed ── */
    if (event === "refund.processed") {
      const refund = payload.payload.refund.entity;

      await Order.findOneAndUpdate(
        { refundId: refund.id },
        { refundStatus: "Processed", paymentStatus: "Refunded" }
      );

      console.log("Webhook: refund.processed —", refund.id);
      return res.json({ success: true });
    }

    /* ── payment.failed ── */
    if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;

      await Order.findOneAndUpdate(
        { "paymentDetails.razorpay_order_id": payment.order_id },
        { paymentStatus: "Failed" }
      );

      console.warn("Webhook: payment.failed —", payment.id);
      return res.json({ success: true });
    }

    // Acknowledge all other events without error
    console.log("Webhook: unhandled event —", event);
    return res.json({ success: true });

  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({ success: false });
  }
};