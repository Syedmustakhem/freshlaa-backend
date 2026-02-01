const mongoose = require("mongoose");

const CategorySectionSchema = new mongoose.Schema(
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
      index: true,
    },

    image: {
      type: String,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    layout: {
      type: String,
      default: "grid",
    },

    columns: {
      type: Number,
      default: 3,
    },

    visible: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* ✅ Auto-generate slug from title */
CategorySectionSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});


module.exports = mongoose.model("CategorySection", CategorySectionSchema);
