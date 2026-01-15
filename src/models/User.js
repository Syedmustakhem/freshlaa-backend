const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* 🔐 AUTH */
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
      trim: true,
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    /* 🛒 CART */
    cart: {
      type: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "cart.itemModel",
          },

          itemModel: {
            type: String,
            required: true,
            enum: ["Product", "HotelMenuItem"],
          },

          qty: {
            type: Number,
            default: 1,
          },

          hotelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            default: null,
          },

          selectedVariant: {
            type: Object,
            default: null,
          },

          selectedAddons: {
            type: Array,
            default: [],
          },

          finalPrice: {
            type: Number,
            default: 0, // 🔥 SAFER
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
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
