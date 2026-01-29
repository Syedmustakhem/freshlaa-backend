const mongoose = require("mongoose");

const CategorySectionSchema = new mongoose.Schema({
  title: String,                 // Section name (shown on top)
  
  image: {
    type: String,                // Section image / icon
    required: false
  },

  order: Number,

  layout: {
    type: String,
    default: "grid"              // future: list, carousel
  },

  columns: {
    type: Number,
    default: 3                   // Zepto style grid
  },

  visible: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("CategorySection", CategorySectionSchema);
