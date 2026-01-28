const mongoose = require("mongoose");

const CategoryBannerSchema = new mongoose.Schema({
  categorySlug: { type: String, required: true },
  image: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("CategoryBanner", CategoryBannerSchema);
