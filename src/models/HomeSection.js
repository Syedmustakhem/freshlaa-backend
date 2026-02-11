const mongoose = require("mongoose");

const HomeSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
  "HEADER",
  "ACTIVE_ORDER",   // 👈 ADD THIS
  "BANNERS",
  "SPONSORED",
  "CATEGORIES",
  "ZEPTO_CATEGORIES",
  "DAILY_NEEDS",
  "QUICK_REORDER",
  "ZOMATO",
  "TRENDING",
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
