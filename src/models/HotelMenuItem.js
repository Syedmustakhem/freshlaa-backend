const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: String,
  price: Number,
  mrp: Number, // optional MRP for variant offers
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
filters: [
  {
    type: String,
    enum: [
      "pizza",
      "burger",
      "juices",
      "non-veg-starters",
      "veg-starters",
      "curries",
      "fried-rice",
      "biryani",
      "non-veg-curries",
      "fast-food",
      "butter-milk",
      "dates-juices",
      "dry-fruit-juices",
      "egg",
      "french-fries",
    ],
    index: true,
  },
],

    mrp: { type: Number }, // 👈 OFFER / DISPLAY PRICE
    basePrice: { type: Number, required: true }, // 👈 REAL SELLING PRICE

    variants: [variantSchema],
    addons: [addonSchema],

    availableFrom: { type: String, default: null },
    availableTo: { type: String, default: null },
isBestseller: {
  type: Boolean,
  default: false,
},

isRecommended: {
  type: Boolean,
  default: false,
},

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
