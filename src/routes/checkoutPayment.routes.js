const express = require("express");
const router = express.Router();
const protect  = require("../middlewares/auth.middleware");
const checkoutPaymentService = require("../services/checkoutPayment.service");

router.get("/config", protect, async (req, res) => {
  try {
    const amount = Number(req.query.amount || 0);

    const config = await checkoutPaymentService.getCheckoutConfig({
      user: req.user,
      amount,
    });

    res.json({
      success: true,
      methods: config,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;