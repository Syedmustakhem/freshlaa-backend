const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["CATEGORY", "PRODUCT", "GLOBAL"],
      required: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENT", "FLAT"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      default: null,
    },

    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);