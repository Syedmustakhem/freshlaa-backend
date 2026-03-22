// src/models/AbandonedCart.js

const mongoose = require("mongoose");

const abandonedCartSchema = new mongoose.Schema({
  // ✅ Either logged-in user or guest
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },

  // Push tokens for notification
  expoPushToken: { type: String, default: null },
  fcmToken:      { type: String, default: null },

  // Cart snapshot
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name:      { type: String },
      price:     { type: Number },
      image:     { type: String },
      qty:       { type: Number },
    },
  ],

  totalAmount: { type: Number, default: 0 },

  // Recovery tracking
  notified:      { type: Boolean, default: false },
  notifiedAt:    { type: Date,    default: null },
  recoveredAt:   { type: Date,    default: null }, // set when user completes order
  isRecovered:   { type: Boolean, default: false },

  lastUpdatedAt: { type: Date, default: Date.now },

}, { timestamps: true });

// ✅ One record per user/guest token — upsert on every cart update
abandonedCartSchema.index({ userId: 1 },          { sparse: true });
abandonedCartSchema.index({ expoPushToken: 1 },   { sparse: true });

// ✅ Auto-delete after 7 days
abandonedCartSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model("AbandonedCart", abandonedCartSchema);