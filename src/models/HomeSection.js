const mongoose = require("mongoose");

const HomeSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "HEADER",
      "ACTIVE_ORDER",
      "RAMADAN_SPECIAL",    // 👈 NEW - Add Ramadan section
      "BANNERS",
      "SPONSORED",
      "CATEGORIES",
      "ZEPTO_CATEGORIES",
     // ✅ ADD THIS LINE

      "DAILY_NEEDS",
      
      "ZOMATO",
     
      "CATEGORY_CAROUSEL",
      "TRENDING",
      "REVIEWS",
      "QUICK_REORDER",
      "FOOTER",
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