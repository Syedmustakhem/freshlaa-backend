const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: String,
    address: String,

    /* 🔥 CATEGORY LINK (IMPORTANT) */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    /* 🔥 OPEN / CLOSE */
    isOpen: { type: Boolean, default: true },

    /* OPTIONAL (future use) */
    opensAt: String,   // "09:00"
    closesAt: String, // "23:30"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
