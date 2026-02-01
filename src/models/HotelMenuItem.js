const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: String,        // Half / Full
  price: Number,
});

const addonSchema = new mongoose.Schema({
  name: String,         // Extra egg
  price: Number,
  isAvailable: { type: Boolean, default: true },
});

const hotelMenuItemSchema = new mongoose.Schema(
  {
    /* BASIC INFO */
    name: { type: String, required: true },
    description: String,
    image: String,

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    categoryKey: { type: String, required: true }, // biryani, rolls
    basePrice: { type: Number, required: true },

    variants: [variantSchema],
    addons: [addonSchema],

    /* 🔥 ITEM AVAILABILITY TIMING */
    availableFrom: {
      type: String, // "07:00"
      default: null,
    },

    availableTo: {
      type: String, // "11:00"
      default: null,
    },

    /* 🚚 ITEM DELIVERY TIME */
    deliveryTime: {
      type: String, // "15–20 mins"
      default: "20–30 mins",
    },

    /* STATUS */
    // isAvailable: { type: Boolean, default: true },

    outOfStockUntil: Date, // ⏱ auto restore
  },
  { timestamps: true }
);

module.exports = mongoose.model("HotelMenuItem", hotelMenuItemSchema);
