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
      index: true,
    },

    fcmToken: {
      type: String,
      default: null,
      index: true,
    },

    pushDevice: {
      type: String,
      enum: ["android", "ios", "web"],
      default: "android",
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
            min: 1,
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
            default: 0,
          },
        },
      ],
      default: [],
    },
codBlocked: {
  type:    Boolean,
  default: false,
},
    /* ⏱️ META */

    lastLogin: {
      type: Date,
      default: Date.now,
    },
codOverride: {
  type:    Boolean,
  default: false, // false = normal auto-block rules apply
                  // true  = admin has manually enabled COD
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

/* 🔧 OPTIONAL: Remove duplicate tokens automatically */

userSchema.index({ expoPushToken: 1 }, { sparse: true });
userSchema.index({ fcmToken: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);