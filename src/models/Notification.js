const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: String, // ORDER, MARKETING
    channel: String, // PUSH, WHATSAPP
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    template: String,
    payload: Object,
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
