const mongoose = require("mongoose");

const appConfigSchema = new mongoose.Schema({
  freeDeliveryLimit: { type: Number, default: 99 },
  deliveryFee: { type: Number, default: 20 },
  handlingFee: { type: Number, default: 2 },
  surgeEnabled: { type: Boolean, default: false },
  surgeMultiplier: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model("AppConfig", appConfigSchema);