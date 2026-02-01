const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: String,
  price: Number,
});

const addonSchema = new mongoose.Schema({
  name: String,
  price: Number,
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

    categoryKey: { type: String, required: true },
    basePrice: { type: Number, required: true },

    variants: [variantSchema],
    addons: [addonSchema],

    availableFrom: { type: String, default: null },
    availableTo: { type: String, default: null },

    deliveryTime: {
      type: String,
      default: "20–30 mins",
    },

    isAvailable: { type: Boolean, default: true },

    outOfStockUntil: Date,
  },
  { timestamps: true }
);

hotelMenuItemSchema.index({
  hotelId: 1,
  categoryKey: 1,
  isAvailable: 1,
});

module.exports = mongoose.model("HotelMenuItem", hotelMenuItemSchema);
