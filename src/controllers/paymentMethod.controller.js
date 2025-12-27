const PaymentMethod = require("../models/PaymentMethod");

/* ADD PAYMENT METHOD */
exports.addPaymentMethod = async (req, res) => {
  try {
    const { type, upiId } = req.body;

    if (type === "UPI" && !upiId) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required",
      });
    }

    // unset previous default
    await PaymentMethod.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );

    const method = await PaymentMethod.create({
      user: req.user._id,
      type,
      upiId: upiId || "",
      isDefault: true,
    });

    res.status(201).json({
      success: true,
      method,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save payment method",
    });
  }
};
exports.addPaymentMethod = async (req, res) => {
  try {
    const {
      type,
      upiId,
      provider,
      gatewayRef,
      last4,
    } = req.body;

    if (type === "UPI" && !upiId) {
      return res.status(400).json({ message: "UPI ID required" });
    }

    if ((type === "CARD" || type === "WALLET") && !gatewayRef) {
      return res
        .status(400)
        .json({ message: "Payment reference missing" });
    }

    await PaymentMethod.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );

    const method = await PaymentMethod.create({
      user: req.user._id,
      type,
      upiId: upiId || "",
      provider: provider || "",
      gatewayRef: gatewayRef || "",
      last4: last4 || "",
      isDefault: true,
    });

    res.status(201).json({ success: true, method });
  } catch (err) {
    res.status(500).json({ message: "Failed to add payment method" });
  }
};

/* GET PAYMENT METHODS */
exports.getPaymentMethods = async (req, res) => {
  const methods = await PaymentMethod.find({
    user: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({ success: true, methods });
};

/* DELETE PAYMENT METHOD */
exports.deletePaymentMethod = async (req, res) => {
  await PaymentMethod.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  res.json({ success: true });
};

/* SET DEFAULT PAYMENT */
exports.setDefaultPayment = async (req, res) => {
  await PaymentMethod.updateMany(
    { user: req.user._id },
    { isDefault: false }
  );

  const method = await PaymentMethod.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isDefault: true },
    { new: true }
  );

  res.json({ success: true, method });
};
