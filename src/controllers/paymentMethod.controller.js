const PaymentMethod = require("../models/PaymentMethod");

/* ================= ADD PAYMENT METHOD ================= */
exports.addPaymentMethod = async (req, res) => {
  try {
    const {
      type,
      upiId,
      provider,
      gatewayRef,
      last4,
    } = req.body;

    /* ---------- VALIDATION ---------- */
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required",
      });
    }

    if (type === "UPI" && !upiId) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required",
      });
    }

    if ((type === "CARD" || type === "WALLET") && !gatewayRef) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    /* ---------- RESET DEFAULT ---------- */
    await PaymentMethod.updateMany(
      { user: req.user.id || req.user._id },
      { isDefault: false }
    );

    /* ---------- CREATE METHOD ---------- */
    const method = await PaymentMethod.create({
      user: req.user.id || req.user._id,
      type,
      upiId: upiId || "",
      provider: provider || "",
      gatewayRef: gatewayRef || "",
      last4: last4 || "",
      isDefault: true,
    });

    res.status(201).json({
      success: true,
      method,
    });
  } catch (error) {
    console.error("Add payment method error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save payment method",
    });
  }
};

/* ================= GET PAYMENT METHODS ================= */
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({
      user: req.user.id || req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      methods,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment methods",
    });
  }
};

/* ================= DELETE PAYMENT METHOD ================= */
exports.deletePaymentMethod = async (req, res) => {
  try {
    await PaymentMethod.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id || req.user._id,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete payment method",
    });
  }
};

/* ================= SET DEFAULT PAYMENT ================= */
exports.setDefaultPayment = async (req, res) => {
  try {
    await PaymentMethod.updateMany(
      { user: req.user.id || req.user._id },
      { isDefault: false }
    );

    const method = await PaymentMethod.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id || req.user._id },
      { isDefault: true },
      { new: true }
    );

    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    res.json({
      success: true,
      method,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to set default payment method",
    });
  }
};
