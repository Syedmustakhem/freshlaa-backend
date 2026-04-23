/**
 * Review.model.js
 * Full Flipkart/Amazon style review system
 */
const mongoose = require("mongoose");

// ─── Reply from seller/admin
const replySchema = new mongoose.Schema({
  message:   { type: String, required: true, trim: true, maxlength: 1000 },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:      { type: String, default: "Freshlaa Team" },
  repliedAt: { type: Date, default: Date.now },
}, { _id: false });

// ─── Helpful votes (who voted — prevents duplicate votes)
const helpfulSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  votedAt: { type: Date, default: Date.now },
}, { _id: false });

const reviewSchema = new mongoose.Schema({

  // ── What is being reviewed
  reviewType: {
    type:     String,
    enum:     ["product", "order", "hotel", "delivery"],
    required: true,
    index:    true,
  },

  // ── Target references (only one will be set based on reviewType)
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product",      default: null },
  order:   { type: mongoose.Schema.Types.ObjectId, ref: "Order",        default: null },
  hotel:   { type: mongoose.Schema.Types.ObjectId, ref: "Hotel",        default: null },

  // ── Who wrote it
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    index:    true,
  },

  // ── Core review content
  rating: {
    type:     Number,
    required: true,
    min:      1,
    max:      5,
  },

  title:   { type: String, trim: true, maxlength: 100, default: "" },
  body:    { type: String, trim: true, maxlength: 2000, default: "" },

  // ── Photos (uploaded URLs — handle upload separately via S3/Cloudinary)
  photos: {
    type:    [String],
    default: [],
    validate: {
      validator: (v) => v.length <= 5,
      message:   "Maximum 5 photos allowed per review",
    },
  },

  // ── Verified purchase badge
  // True only if user has a delivered order containing this product/hotel
  isVerifiedPurchase: { type: Boolean, default: false },

  // ── Helpful votes
  helpfulVotes: { type: [helpfulSchema], default: [] },
  helpfulCount: { type: Number, default: 0 }, // denormalized for fast sort

  // ── Admin moderation
  status: {
    type:    String,
    enum:    ["pending", "approved", "rejected"],
    default: "pending", // auto-publish; change to "pending" if you want moderation
    index:   true,
  },
  rejectionReason: { type: String, default: null },

  // ── Seller/admin reply
  reply: { type: replySchema, default: null },

  // ── Soft delete
  isDeleted: { type: Boolean, default: false, index: true },

}, { timestamps: true });

// ─── Compound indexes for fast queries
reviewSchema.index({ product: 1,  status: 1, createdAt: -1 });
reviewSchema.index({ order:   1,  status: 1 });
reviewSchema.index({ hotel:   1,  status: 1, createdAt: -1 });
reviewSchema.index({ user:    1,  reviewType: 1 });
reviewSchema.index({ status:  1,  createdAt: -1 }); // admin dashboard

// ─── Prevent duplicate reviews:
//     One user can review a product once per order (or once total for delivery/order)
reviewSchema.index(
  { user: 1, product: 1, order: 1 },
  { unique: true, sparse: true, partialFilterExpression: { product: { $ne: null } } }
);
reviewSchema.index(
  { user: 1, order: 1, reviewType: 1 },
  { unique: true, sparse: true, partialFilterExpression: { reviewType: { $in: ["order", "delivery"] } } }
);
reviewSchema.index(
  { user: 1, hotel: 1 },
  { unique: true, sparse: true, partialFilterExpression: { hotel: { $ne: null } } }
);

module.exports = mongoose.model("Review", reviewSchema);