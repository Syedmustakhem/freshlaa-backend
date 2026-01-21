const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    // 🔥 4 images for grid
    images: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length === 4;
        },
        message: "Exactly 4 images are required",
      },
      required: true,
    },

    // "+10 more" text
    more: {
      type: String,
      default: "",
    },

    // For future category sections
    type: {
      type: String,
      default: "shop_by_category",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
