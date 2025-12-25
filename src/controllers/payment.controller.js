const razorpay = require("../utils/razorpay");

exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // ₹ → paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
