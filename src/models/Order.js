const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        productId: String,
        name: String,
        price: Number,
        qty: Number,
      },
    ],

    address: {
      type: Object,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    total: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Placed", "Packed", "Out for Delivery", "Delivered"],
      default: "Placed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);