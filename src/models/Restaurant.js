const mongoose = require("mongoose");
const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: String,
    address: String,

    categorySlug: {
      type: String,
      required: true,
      index: true,
    },
filters: [
  {
    label: { type: String, required: true },
    key: { type: String, required: true }
  }
],

    /* 🕒 RESTAURANT TIMINGS */
    openTime: {
      type: String, // "09:00"
      required: true,
    },

    closeTime: {
      type: String, // "23:00"
      required: true,
    },

    /* 🔁 MANUAL OVERRIDE */
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
