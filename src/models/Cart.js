// src/models/Cart.js

const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId:       { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  itemModel:       { type: String, default: "Product" },
  qty:             { type: Number, default: 1, min: 1 },
  finalPrice:      { type: Number, default: 0 },
  selectedVariant: { type: mongoose.Schema.Types.Mixed, default: null },
  selectedAddons:  { type: Array,  default: [] },
  hotelId:         { type: mongoose.Schema.Types.ObjectId, default: null },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);