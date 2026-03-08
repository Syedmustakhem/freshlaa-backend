// models/OffersPage.js
const mongoose = require("mongoose");

const ProductSectionSchema = new mongoose.Schema(
  {
    title:      { type: String, default: "" },
    subtitle:   { type: String, default: "" },
    badge:      { type: String, default: "" },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { _id: false }
);

const OffersPageSchema = new mongoose.Schema(
  {
    slug:           { type: String, required: true, unique: true, trim: true, lowercase: true },
    banner:         { type: String, default: "" },
    title:          { type: String, default: "" },
    subtitle:       { type: String, default: "" },
    countdownHours: { type: Number, default: 6 },
    isActive:       { type: Boolean, default: true },
    sections:       [ProductSectionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("OffersPage", OffersPageSchema);