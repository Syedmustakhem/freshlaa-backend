const mongoose = require("mongoose");

// ─── All valid animation types (matches your frontend switch cases)
const ANIMATION_TYPES = [
  "none", "wave", "shimmer", "pulse", "gradientWave",
  "particles", "aurora", "scanLines", "ripple",
  "confetti", "stars", "sunrise", "glow"
];

const animationSchema = new mongoose.Schema({
  type:           { type: String, enum: ANIMATION_TYPES, default: "none" },
  speed:          { type: Number, default: 4000 },
  intensity:      { type: Number, default: 300 },     // was 50 — frontend uses 300
  density:        { type: Number, default: 12 },       // particles / confetti / stars
  color:          { type: String, default: null },      // primary animation color
  secondaryColor: { type: String, default: null },      // gradientWave / aurora second layer
}, { _id: false });

const uiConfigSchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true, trim: true }, // "wave", "luxury" etc.
  title: { type: String, default: "Freshlaa" },                      // shown in header

  header: {
    gradient:  { type: [String], default: ["#00C853", "#00897B"] },
    animation: { type: animationSchema, default: () => ({}) },
  },

  featureFlags: {
    flashSale:    { type: Boolean, default: false },
    festivalMode: { type: Boolean, default: false },
  },

  schedule: {
    startTime: { type: Date, default: null },
    endTime:   { type: Date, default: null },
  },

  overrideNight: { type: Boolean, default: false }, // skip time-based theme override

  isActive: { type: Boolean, default: false },      // changed default to false — safer

}, { timestamps: true });

// ─── Only ONE document can be active at a time
uiConfigSchema.index(
  { isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// ─── Fast lookup (controller always queries this)
uiConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model("UIConfig", uiConfigSchema);