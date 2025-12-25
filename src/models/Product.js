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
    shopifyId: {
      type: String,
      unique: true,
      sparse: true,
    },

    source: {
      type: String,
      enum: ["shopify", "manual"],
      default: "manual",
    },

    allowShopifySync: {
  type: Boolean,
  default: true, // IMPORTANT
},

    /* 🔥 NEW FIELDS */
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

    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    image: {
      type: String, // Cloudinary / S3 URL
      required: true,
    },

    unit: {
      type: String, // "1 kg", "500 ml"
      required: true,
    },

    stock: {
      type: Number,
      default: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
