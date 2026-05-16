const mongoose = require("mongoose");

const serviceableAreaSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    areaName: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isInstantAvailable: {
      type: Boolean,
      default: true,
    },
    estimatedTime: {
      type: String,
      default: "", // e.g. "15 mins" (Overrides global rules if set)
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceableArea", serviceableAreaSchema);
