const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        productId: String,
        name: String,
        price: Number,
        image: String,
        qty: Number,
        
        // 🆕 Optional fields - only populated for hotel orders
        itemModel: {
          type: String,
          enum: ["HotelMenuItem", "Product"],
          default: "Product" // Default to grocery
        },
        
        // 🆕 Hotel-specific fields (optional)
        variant: {
          key: String,
          label: String,
          price: Number
        },
        selectedAddons: [{
          name: String,
          price: Number
        }],
        customizations: {
          spiceLevel: String,
          specialInstructions: String
        },
        hotelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Restaurant"
        }
      },
    ],

    address: {
      type: Object,
      required: true,
    },

    // 🆕 Scheduled delivery (optional - only for hotel orders)
    scheduledFor: {
      type: Date,
      default: null
    },
    isScheduled: {
      type: Boolean,
      default: false
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    /* ===== PAYMENT FIELDS (CRITICAL) ===== */
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paymentDetails: {
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
      razorpay_signature: { type: String },
    },

    total: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Placed",
        "Packed",
        "OutForDelivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Placed",
    },
  },
  { timestamps: true }
);

// 🆕 Index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "items.itemModel": 1 });

module.exports = mongoose.model("Order", orderSchema);