const PaymentMethod = require("../models/PaymentMethod");

/* ─── HELPERS ───────────────────────────────────────────────────────────── */

// Consistent user ID access — avoids req.user.id || req.user._id sprinkled everywhere
const uid = (req) => req.user._id;

/* ─── ADD PAYMENT METHOD ────────────────────────────────────────────────────
   Body: { type, upiId?, provider?, gatewayRef?, last4? }
   The new method is automatically set as default.
──────────────────────────────────────────────────────────────────────────── */
exports.addPaymentMethod = async (req, res) => {
  try {
    const { type, upiId, provider, gatewayRef, last4 } = req.body;

    /* ── Validation ── */
    if (!type) {
      return res.status(400).json({ success: false, message: "Payment type is required" });
    }

    const validTypes = ["UPI", "CARD", "WALLET", "NETBANKING"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    if (type === "UPI" && !upiId?.trim()) {
      return res.status(400).json({ success: false, message: "UPI ID is required" });
    }

    if (["CARD", "WALLET"].includes(type) && !gatewayRef?.trim()) {
      return res.status(400).json({ success: false, message: "Payment reference is required" });
    }

    /* ── Demote existing default in the same write ── */
    await PaymentMethod.updateMany({ user: uid(req) }, { isDefault: false });

    const method = await PaymentMethod.create({
      user:       uid(req),
      type,
      upiId:      upiId?.trim()      || "",
      provider:   provider?.trim()   || "",
      gatewayRef: gatewayRef?.trim() || "",
      last4:      last4?.trim()      || "",
      isDefault:  true,
    });

    return res.status(201).json({ success: true, method });

  } catch (error) {
    console.error("addPaymentMethod error:", error);
    return res.status(500).json({ success: false, message: "Failed to save payment method" });
  }
};

/* ─── GET PAYMENT METHODS ───────────────────────────────────────────────── */
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ user: uid(req) }).sort({ createdAt: -1 });
    return res.json({ success: true, methods });
  } catch (error) {
    console.error("getPaymentMethods error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment methods" });
  }
};

/* ─── DELETE PAYMENT METHOD ─────────────────────────────────────────────── */
exports.deletePaymentMethod = async (req, res) => {
  try {
    // Scope deletion to the requesting user — prevents users deleting each other's records
    const deleted = await PaymentMethod.findOneAndDelete({
      _id:  req.params.id,
      user: uid(req),
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    return res.json({ success: true, message: "Payment method removed" });

  } catch (error) {
    console.error("deletePaymentMethod error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete payment method" });
  }
};

/* ─── SET DEFAULT PAYMENT METHOD ────────────────────────────────────────── */
exports.setDefaultPayment = async (req, res) => {
  try {
    // Verify the method belongs to this user before touching anything
    const method = await PaymentMethod.findOne({ _id: req.params.id, user: uid(req) });
    if (!method) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    // Demote all, then promote the target
    await PaymentMethod.updateMany({ user: uid(req) }, { isDefault: false });
    method.isDefault = true;
    await method.save();

    return res.json({ success: true, method });

  } catch (error) {
    console.error("setDefaultPayment error:", error);
    return res.status(500).json({ success: false, message: "Failed to set default payment method" });
  }
};