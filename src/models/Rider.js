// models/Rider.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const RiderSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone:    { type: String, required: true, trim: true },
    avatar:   { type: String, default: null },

    isActive:   { type: Boolean, default: true  },  // account active
    isOnline:   { type: Boolean, default: false },   // currently on shift
    isApproved: { type: Boolean, default: false },   // admin approved

    // Current location (updated live while on shift)
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    // Currently assigned order
    currentOrderId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Order",
      default: null,
    },

    // Earnings summary
    earnings: {
      today:   { type: Number, default: 0 },
      week:    { type: Number, default: 0 },
      month:   { type: Number, default: 0 },
      total:   { type: Number, default: 0 },
    },

    // Delivery stats
    stats: {
      totalDeliveries:  { type: Number, default: 0 },
      todayDeliveries:  { type: Number, default: 0 },
      rating:           { type: Number, default: 5.0 },
      ratingCount:      { type: Number, default: 0 },
    },

    // Per-delivery log
    deliveryHistory: [
      {
        orderId:     { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        amount:      { type: Number },
        deliveredAt: { type: Date },
        earning:     { type: Number, default: 30 }, // ₹ per delivery
      },
    ],
  },
  { timestamps: true }
);

// Hash password before save
RiderSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
RiderSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("Rider", RiderSchema);