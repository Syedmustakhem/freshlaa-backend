const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* 🔐 AUTH */
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* 🔔 PUSH NOTIFICATIONS */
    expoPushToken: {
      type: String,
      default: null,
    },

    /* 👤 PROFILE */
    name: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    /* 🛒 CART */
    cart: {
      type: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          qty: {
            type: Number,
            default: 1,
          },
        },
      ],
      default: [],
    },

    /* ⏱️ META */
    lastLogin: {
      type: Date,
      default: Date.now,
    },

    /* 🛡️ STATUS */
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);