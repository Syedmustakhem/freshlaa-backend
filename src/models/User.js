const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* 🔐 AUTH */
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
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
      default: [], // ✅ prevents undefined cart errors
    },

    /* ⏱️ META */
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);
