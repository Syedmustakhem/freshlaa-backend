const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  try {
    const amountInRupees = Number(req.body?.amount);

    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const amount = amountInRupees * 100; // convert to paise

    const order = await razorpay.orders.create({
      amount,
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
      message: "Failed to create Razorpay order",
    });
  }
};


/* ================= VERIFY PAYMENT ================= */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment verification data",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // 🔥 Mark order as Paid (extra safety)
    await Order.findOneAndUpdate(
      { "paymentDetails.razorpay_order_id": razorpay_order_id },
      { paymentStatus: "Paid" }
    );

    return res.json({
      success: true,
      message: "Payment verified",
    });

  } catch (error) {
    console.error("❌ Razorpay verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification error",
    });
  }
};


/* ================= WEBHOOK (ENTERPRISE SAFE) ================= */
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false });
    }

    const event = req.body.event;

    /* 🔥 PAYMENT CAPTURED */
    if (event === "payment.captured") {
      const payment = req.body.payload.payment.entity;

      await Order.findOneAndUpdate(
        { "paymentDetails.razorpay_payment_id": payment.id },
        { paymentStatus: "Paid" }
      );

      console.log("✅ Payment captured:", payment.id);
    }

    /* 🔥 REFUND PROCESSED */
    if (event === "refund.processed") {
      const refund = req.body.payload.refund.entity;

      await Order.findOneAndUpdate(
        { refundId: refund.id },
        {
          refundStatus: "Processed",
          paymentStatus: "Refunded",
        }
      );

      console.log("✅ Refund processed:", refund.id);
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ success: false });
  }
};