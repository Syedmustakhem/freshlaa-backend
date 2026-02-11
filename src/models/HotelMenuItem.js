const mongoose = require("mongoose");

/* ================= VARIANT SCHEMA ================= */
const variantSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true, // auto-generated from label in frontend
  },
  label: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  mrp: Number,
});

/* ================= ADDON SCHEMA ================= */
const addonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    enum: ["topping", "side", "drink", "extra"],
    default: "extra",
  },
});

/* ================= MAIN MENU SCHEMA ================= */
const hotelMenuItemSchema = new mongoose.Schema(
  {
    /* BASIC INFO */
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    /* CATEGORY */
    categoryKey: {
      type: String,
      required: true,
      index: true,
    },

    /* FILTERS (MATCHING FRONTEND EXACTLY) */
    filters: [
      {
        type: String,
        enum: [
          "pizza",
          "burger",
          "juices",
          "veg-starters",
          "non-veg-starters",
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

          // ✅ Newly added frontend filters
          "dum-biryani",
          "chicken-mandi",
          "mutton-mandi",
          "fish",
          "dry-items",
          "roti-items",
          "veg-curries",
        ],
        index: true,
      },
    ],

    /* PRICING */
    basePrice: {
      type: Number,
      default: null, // NOT required anymore (variants supported)
    },

    mrp: {
      type: Number,
      default: null,
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    addons: {
      type: [addonSchema],
      default: [],
    },

    /* TIMING */
    availableFrom: {
      type: String,
      default: null,
    },

    availableTo: {
      type: String,
      default: null,
    },

    deliveryTime: {
      type: String,
      default: "20-30 mins",
    },

    /* BADGES */
    isBestseller: {
      type: Boolean,
      default: false,
    },

    isRecommended: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    outOfStockUntil: {
      type: Date,
      default: null,
    },

    /* ANALYTICS */
    orderCount: {
      type: Number,
      default: 0,
    },

    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

hotelMenuItemSchema.index({
  hotelId: 1,
  categoryKey: 1,
  isAvailable: 1,
});

/* ================= EXPORT ================= */

module.exports = mongoose.model("HotelMenuItem", hotelMenuItemSchema);
