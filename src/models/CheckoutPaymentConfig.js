const mongoose = require("mongoose");

const checkoutPaymentConfigSchema = new mongoose.Schema(
  {
    code: {
      type: String, // COD, ONLINE
      required: true,
      unique: true,
    },

    label: String,

    enabled: {
      type: Boolean,
      default: true,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
    },

    maxOrderAmount: {
      type: Number,
      default: null,
    },

    codFee: {
      type: Number,
      default: 0,
    },

    priority: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CheckoutPaymentConfig",
  checkoutPaymentConfigSchema
);