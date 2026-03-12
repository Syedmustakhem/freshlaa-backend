const service = require("../services/checkoutPayment.service");

/* ─── GET CHECKOUT CONFIG ──────────────────────────────────────────────────
   Returns available payment methods for the current user + cart amount.
   The frontend calls this on mount: GET /checkout-payment/config?amount=499
──────────────────────────────────────────────────────────────────────────── */
exports.getCheckoutConfig = async (req, res) => {
  try {
    const amount = Number(req.query.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid order amount is required",
      });
    }

    const methods = await service.getCheckoutPaymentOptions({
      userId: req.user._id,
      amount,
    });

    return res.json({ success: true, methods });

  } catch (error) {
    console.error("getCheckoutConfig error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load payment options",
    });
  }
};