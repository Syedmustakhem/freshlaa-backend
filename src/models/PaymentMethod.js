const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["COD", "UPI", "CARD", "WALLET"],
      required: true,
    },

    /* UPI */
    upiId: {
      type: String,
      default: "",
    },

    /* CARD / WALLET (Razorpay reference) */
    provider: {
      type: String, // visa, mastercard, paytm, amazonpay
      default: "",
    },

    gatewayRef: {
      type: String, // razorpay_payment_id / token
      default: "",
    },

    last4: {
      type: String, // card last 4 digits
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
