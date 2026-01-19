const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: {
    type: String, // "500 ml", "1 kg", "6 pcs"
    required: true,
    trim: true,
  },

  unit: {
    type: String,
    enum: ["kg", "g", "l", "ml", "pcs"],
    required: true,
  },

  value: {
    type: Number,
    required: true,
    min: 0.001,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  mrp: {
    type: Number,
    min: 0,
  },

  stock: {
    type: Number,
    min: 0,
    default: 0,
  },

  isDefault: {
    type: Boolean,
    default: false,
  },
});


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

    category: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    images: {
      type: [String],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // ✅ PRODUCT MASTER STOCK
    },

    variants: {
      type: [variantSchema],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0,
    },

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
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    source: {
      type: String,
      enum: ["manual"],
      default: "manual",
    },

    allowShopifySync: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Product", productSchema)