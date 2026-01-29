const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String },

    // 🔥 hierarchy (sub-categories)
    parentSlug: {
      type: String,
      default: null, // null = main category
    },

    // 🔝 link category to section
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategorySection",
      default: null,
    },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
