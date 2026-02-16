const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    /* ================= USER ================= */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ================= ITEMS ================= */
    items: [
      {
        productId: String,
        name: String,
        price: Number,
        image: String,
        qty: Number,

        // Grocery or Hotel
        itemModel: {
          type: String,
          enum: ["HotelMenuItem", "Product"],
          default: "Product",
        },

        // Hotel optional fields
        variant: {
          key: String,
          label: String,
          price: Number,
        },

        selectedAddons: [
          {
            name: String,
            price: Number,
          },
        ],

        customizations: {
          spiceLevel: String,
          specialInstructions: String,
        },

        hotelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Restaurant",
        },
      },
    ],

    /* ================= DELIVERY ================= */
    address: {
      type: Object,
      required: true,
    },

    scheduledFor: {
      type: Date,
      default: null,
    },

    isScheduled: {
      type: Boolean,
      default: false,
    },

    /* ================= PAYMENT ================= */

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

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

    /* ================= REFUND ================= */

    refundId: {
      type: String,
      default: null,
    },

    refundStatus: {
      type: String,
      enum: ["None", "Initiated", "Processed", "Failed"],
      default: "None",
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    /* ================= ORDER TOTAL ================= */

    total: {
      type: Number,
      required: true,
    },

    /* ================= ORDER STATUS ================= */

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

/* ================= INDEXES ================= */

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "paymentDetails.razorpay_payment_id": 1 });
orderSchema.index({ refundId: 1 });

module.exports = mongoose.model("Order", orderSchema);