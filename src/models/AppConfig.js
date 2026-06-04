const mongoose = require("mongoose");

const appConfigSchema = new mongoose.Schema({
  // Delivery Settings
  freeDeliveryLimit: { type: Number, default: 99 },
  deliveryFee: { type: Number, default: 20 },
  handlingFee: { type: Number, default: 2 },
  surgeEnabled: { type: Boolean, default: false },
  surgeMultiplier: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  night_mode: { type: Boolean, default: false },

  // Dynamic Delivery Timing
  deliveryTiming: {
    globalDelayMins: { type: Number, default: 0 },
    baseEtaRange: { type: String, default: "30-40 mins" },
    cutoffHour: { type: Number, default: 22 }, // 10 PM
    distanceRules: [{
      maxKm: { type: Number },
      eta: { type: String }
    }]
  },

  // App Versioning
  min_version_android: { type: String, default: "1.0.0" },
  latest_version_android: { type: String, default: "1.0.0" },
  min_version_ios: { type: String, default: "1.0.0" },
  force_update_message: { 
    type: String, 
    default: "A new version of FreshLaa is available with important improvements." 
  },

  // Maintenance Settings
  maintenance_mode: { type: Boolean, default: false },
  maintenance_message: { 
    type: String, 
    default: "FreshLaa is currently under maintenance. Please try again later." 
  },

  // Splash Screen
  splash: {
    type: { type: String, default: "image" },
    lottie_url: { type: String },
    image_url: { type: String },
    duration_ms: { type: Number, default: 1500 },
  },

  // Dynamic Feature Flags
  features: {
    checkoutInterceptEnabled: { type: Boolean, default: true },
    printServiceEnabled: { type: Boolean, default: true },
    pharmacyServiceEnabled: { type: Boolean, default: true },
  },

  // Loyalty Coin System
  loyaltyCoins: {
    enabled: { type: Boolean, default: false },
    coinsPer100Spent: { type: Number, default: 10 },
    coinsPerRupeeDiscount: { type: Number, default: 5 }, // e.g. 5 coins = 1 Rs off
    minOrderValueForCoins: { type: Number, default: 100 },
    maxRedemptionPercentage: { type: Number, default: 50 },
  },
}, { timestamps: true });

module.exports = mongoose.model("AppConfig", appConfigSchema);