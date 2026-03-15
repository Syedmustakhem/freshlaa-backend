const mongoose = require("mongoose");

// Stores push tokens for non-logged-in (guest) users.
// Useful for sending re-engagement pushes, restock alerts, promos.
const guestTokenSchema = new mongoose.Schema(
  {
    expoPushToken: { type: String, sparse: true },
    fcmToken:      { type: String, sparse: true },
    device:        { type: String, enum: ["ios", "android"] },
    lastSeen:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Auto-delete guest tokens not seen in 90 days
guestTokenSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("GuestToken", guestTokenSchema);