const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  title: String,
  slug: String,
  image: String,
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CategorySection"
  },
  order: Number,
  visible: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("Category", CategorySchema);
