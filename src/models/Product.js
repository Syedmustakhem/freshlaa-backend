const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
label: { type: String, trim: true, default: "" },  unit: { type: String, enum: ["kg", "g", "l", "ml", "pcs"], required: true },
  value: { type: Number, required: true, min: 0.001 },
  price: { type: Number, required: true, min: 0 },
  mrp: { type: Number, min: 0 },
  stock: { type: Number, min: 0, default: 0 },
  isDefault: { type: Boolean, default: false },
});

const productSchema = new mongoose.Schema(
  {
    /* ================= CORE INFO ================= */
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    /* ================= NEW (IMPORTANT) ================= */
   sectionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "CategorySection",
  required: false,   // ✅ make optional
  default: null
},

    subCategory: {
  type: String,
  trim: true,
  index: true,
  default: null,
},

    /* ================= OLD CATEGORY (KEEP FOR BACKWARD COMPATIBILITY) ================= */
    category: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    /* ================= MEDIA ================= */
    images: {
      type: [String],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0,
    },

    /* ================= STOCK ================= */
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    variants: {
      type: [variantSchema],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0,
    },

    /* ================= FLAGS ================= */
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },

    offerPercentage: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    /* ================= META ================= */
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
