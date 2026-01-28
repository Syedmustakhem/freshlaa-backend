const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: String,
    address: String,

    // 🔥 THIS IS THE KEY
    categorySlug: {
      type: String,
      required: true,
      index: true,
    },

    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
