const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type:    String, // ORDER, MARKETING, OFFER, CATEGORY, CAMPAIGN
    channel: String, // PUSH, WHATSAPP

    // ✅ Added: push payload fields (were being saved in service but missing from schema)
    title:    String,
    body:     String,
    imageUrl: String,
    data:     Object, // deep link data e.g. { screen, orderId, productId ... }

    status: {
      type:    String,
      enum:    ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },

    template: String,  // WhatsApp template name
    payload:  Object,  // generic fallback payload
    error:    String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);