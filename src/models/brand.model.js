const mongoose = require("mongoose");

const brandProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  displayOrder: { type: Number, default: 0 },
});

const brandSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["hero_banner", "promo_banner", "featured_products", "image_strip"],
    required: true,
  },
  title: { type: String, default: "" },
  image: { type: String, default: null },       // S3 URL
  images: { type: [String], default: [] },      // multiple images (strip)
  actionUrl: { type: String, default: null },   // deep link
  products: { type: [brandProductSchema], default: [] },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const brandSchema = new mongoose.Schema(
  {
    tabIcon: { type: String, default: null },    // S3 URL for the tab photo
    tabLabel: { type: String, default: "Brand" },
    sections: { type: [brandSectionSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);