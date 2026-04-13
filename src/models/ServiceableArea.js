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
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceableArea", serviceableAreaSchema);
