const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  key: {
    type: String, // "half", "full"
    required: true,
  },
  label: String, // "Half", "Full"
  price: Number,
  mrp: Number,
});

const addonSchema = new mongoose.Schema({
  name: String,
  price: Number,
  isAvailable: { type: Boolean, default: true },
  category: {
    type: String,
    enum: ["topping", "side", "drink", "extra"],
    default: "extra"
  }
});

const customizationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["spice-level", "size", "addon"],
    required: true
  },
  label: String,
  options: [{
    value: String,
    label: String,
    priceModifier: { type: Number, default: 0 }
  }]
});

const hotelMenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    image: String,
    images: [String], // 🆕 Multiple images for carousel

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

    mrp: { type: Number },
    basePrice: { type: Number, required: true },

    variants: [variantSchema],
    addons: [addonSchema],
    customizations: [customizationSchema], // 🆕 Spice levels, sizes, etc.

    // 🆕 Recommendations
    similarItems: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelMenuItem"
    }],

    // 🆕 Popularity tracking
    orderCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

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
    
    // 🆕 Nutrition info (optional)
    nutritionInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }
  },
  { timestamps: true }
);

hotelMenuItemSchema.index({
  hotelId: 1,
  categoryKey: 1,
  isAvailable: 1,
});

module.exports = mongoose.model("HotelMenuItem", hotelMenuItemSchema);