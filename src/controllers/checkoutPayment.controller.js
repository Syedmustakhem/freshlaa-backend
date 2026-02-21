const service = require("../services/checkoutPayment.service");

exports.getCheckoutConfig = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.query;

    const methods = await service.getCheckoutPaymentOptions({
      userId,
      amount: Number(amount),
    });

    res.json({
      success: true,
      methods,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to load payment options",
    });
  }
};