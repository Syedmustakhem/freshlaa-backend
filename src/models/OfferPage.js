// models/OfferPage.js  (replaces your existing one — backwards compatible)
const mongoose = require("mongoose");

// ── Embedded product (your original schema, kept as-is) ──────────
const OfferProductSchema = new mongoose.Schema({
  title:    String,
  image:    String,
  price:    Number,
  mrp:      Number,
  discount: Number,
});

// ── Section ───────────────────────────────────────────────────────
const OfferSectionSchema = new mongoose.Schema({
  title:    String,                                               // "Limited time deals"
  subtitle: String,                                               // NEW — optional
  badge:    String,                                               // NEW — optional

  // NEW — pin real Product documents by _id (used by admin editor)
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  // ORIGINAL — embedded static products (kept for backwards compat)
  products: [OfferProductSchema],
});

// ── Page ──────────────────────────────────────────────────────────
const OfferPageSchema = new mongoose.Schema(
  {
    slug:           { type: String, unique: true, trim: true, lowercase: true },
    banner:         { type: String, default: "" },
    title:          { type: String, default: "" },
    subtitle:       { type: String, default: "" },             // NEW
    countdownHours: { type: Number, default: 6 },              // NEW
    isActive:       { type: Boolean, default: true },          // NEW
    sections:       [OfferSectionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfferPage", OfferPageSchema);