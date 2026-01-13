const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    label: {
      type: String, // "25 g", "100 g", "1 piece", "2 pieces"
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    mrp: {
      type: Number,
      required: true,
    },

    unitType: {
      type: String,
      enum: ["weight", "piece","litre", "price"],
      required: true, // helps frontend logic
    },

    value: {
      type: Number,
      required: true, // 25, 100, 1, 2
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

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
      default: 100,
    },

    /* 🔥 SELLING OPTIONS */
    variants: {
      type: [variantSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    /* 🔥 FLAGS */
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

module.exports = mongoose.model("Product", productSchema);
