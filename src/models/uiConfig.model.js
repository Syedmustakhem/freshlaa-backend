const mongoose = require("mongoose");

const uiConfigSchema = new mongoose.Schema({
  title: String,

  header: {
    gradient: {
      type: [String],
      default: ["#00C853", "#00897B"]
    },

    animation: {
      type: {
        type: String,
        default: "none"
      },
      speed: {
        type: Number,
        default: 4000
      },
      intensity: {
        type: Number,
        default: 50
      },
      glow: {
        type: Boolean,
        default: false
      }
    }
  },

  theme: {
    type: String,
    default: "default"
  },

  featureFlags: {
    flashSale: { type: Boolean, default: false },
    festivalMode: { type: Boolean, default: false }
  },

  schedule: {
    startTime: Date,
    endTime: Date
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("UIConfig", uiConfigSchema);