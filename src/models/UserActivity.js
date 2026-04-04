const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true
    },

    searches: [
      {
        keyword: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    viewedProducts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product"
        },
        viewedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);