// src/models/RestockNotification.js

const mongoose = require("mongoose");

const restockSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },

  // ✅ Logged-in user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },

  // ✅ Guest or logged-in device token
  expoPushToken: { type: String, default: null },
  fcmToken:      { type: String, default: null },

  // Track if notification was already sent
  notified:   { type: Boolean, default: false },
  notifiedAt: { type: Date,    default: null },

  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // auto-delete after 30 days
});

// ✅ Prevent duplicate subscriptions per user+product or token+product
restockSchema.index({ productId: 1, userId: 1 },          { unique: true, sparse: true });
restockSchema.index({ productId: 1, expoPushToken: 1 },   { unique: true, sparse: true });

module.exports = mongoose.model("RestockNotification", restockSchema);