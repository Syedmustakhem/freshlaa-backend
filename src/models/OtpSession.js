const mongoose = require("mongoose");

const otpSessionSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  channel: {
    type: String,
    enum: ["sms", "whatsapp"],
    default: "sms",
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // MongoDB TTL — auto-deletes when expired
  },
});

module.exports = mongoose.model("OtpSession", otpSessionSchema);