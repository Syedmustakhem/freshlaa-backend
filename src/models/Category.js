const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    images: {
      type: [String],
      default: [],
    },

    // 🔥 hierarchy (future nesting support)
    parentSlug: {
      type: String,
      default: null,
      index: true,
    },

    // 🔝 optional section link (for Zepto style categories)
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategorySection",
      default: null,
      index: true,
    },

    // 🔥 SUPER IMPORTANT (future scalable filter)
    displayType: {
      type: String,
      enum: ["section", "top", "featured", "festival", "trending"],
      default: "section",
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
