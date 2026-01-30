const mongoose = require("mongoose");

const CategorySectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,                 // Section name (shown on top)
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,                // used in APIs / URLs
    },

    image: {
      type: String,               // Section image / icon
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    layout: {
      type: String,
      default: "grid",             // grid | list | carousel
    },

    columns: {
      type: Number,
      default: 3,                  // Zepto style grid
    },

    visible: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CategorySection", CategorySectionSchema);
