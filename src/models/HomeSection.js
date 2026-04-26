const mongoose = require("mongoose");

const HomeSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "HEADER",
      "ACTIVE_ORDER",
        "QUICK_FILTERS",   // 👈 NEW - Add Ramadan section
      "BANNERS",
      "SPONSORED",
      "CATEGORIES",
      "ZEPTO_CATEGORIES",
      "DAILY_NEEDS",
      "ZOMATO",
      "CATEGORY_CAROUSEL",
      "TRENDING",
      "REVIEWS",
      "QUICK_REORDER",
      "FOOTER",
      "TRENDING_TICKER",
      "FLASH_SALE",
      "STILL_LOOKING",
      "ALSO_BOUGHT",
      "SUGGESTED_PRODUCTS",
      "EVENT_GRID",
      "DYNAMIC_CATEGORIES",
    ],
  },

  order: {
    type: Number,
    required: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  data: {
    type: mongoose.Schema.Types.Mixed, // flexible JSON
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model("HomeSection", HomeSectionSchema);