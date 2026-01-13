const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: String,        // Half / Full
  price: Number,
});

const addonSchema = new mongoose.Schema({
  name: String,         // Extra egg
  price: Number,        // 20
  isAvailable: { type: Boolean, default: true },
});

const hotelMenuItemSchema = new mongoose.Schema(
  {
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

    isAvailable: { type: Boolean, default: true },

    outOfStockUntil: Date, // ⏱ auto restore
  },
  { timestamps: true }
);

module.exports = mongoose.model("HotelMenuItem", hotelMenuItemSchema);
