const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
    },

    mrp: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    unit: {
      type: String, // "1 kg", "500 ml"
      required: true,
    },

    image: {
      type: String, // image URL
      required: true,
    },

    stock: {
      type: Number,
      default: 100,
    },

    /* 🔥 FLAGS (USED BY ROUTES) */
    isFeatured: {
      type: Boolean,
      default: false,
    },

    isTrending: {
      type: Boolean,
      default: false,
    },

    offerPercentage: {
      type: Number,
      default: 0, // 10 = 10% OFF
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* 🔒 SOURCE CONTROL */
    source: {
      type: String,
      enum: ["manual"],
      default: "manual",
    },

    allowShopifySync: {
      type: Boolean,
      default: false, // 🔴 PERMANENTLY DISABLED
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);