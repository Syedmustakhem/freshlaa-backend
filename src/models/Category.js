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

    // 🔥 hierarchy (used for future nesting if needed)
    parentSlug: {
      type: String,
      default: null, // null = top-level category
      index: true,
    },

    // 🔝 link sub-category to section
   sectionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "CategorySection",
  default: null,
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
