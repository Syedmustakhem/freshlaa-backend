const mongoose = require("mongoose");

const CategorySectionSchema = new mongoose.Schema({
  title: String,                 // Grocery & Kitchen
  order: Number,
  layout: {
    type: String,
    default: "grid"              // future: list, carousel
  },
  columns: {
    type: Number,
    default: 3                   // Zepto = 3
  },
  visible: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("CategorySection", CategorySectionSchema);
