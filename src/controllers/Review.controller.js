/**
 * review.controller.js
 * Full Flipkart/Amazon style review system
 */

const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { notifyUser } = require("../services/notification.service");

// ─────────────────────────────────────────────────────────────
// HELPER — recalculate avg rating on Product document
// ─────────────────────────────────────────────────────────────
async function updateProductRating(productId) {
  try {
    const result = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId.toString()),
          status: "approved",
          isDeleted: false,
        },
      },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const avg = result[0]?.avg ?? 0;
    const count = result[0]?.count ?? 0;

    await Product.findByIdAndUpdate(productId, {
      "rating.average": Math.round(avg * 10) / 10,
      "rating.count": count,
    });
  } catch (err) {
    console.error("updateProductRating error:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// HELPER — verify user actually purchased the item
// ─────────────────────────────────────────────────────────────
async function checkVerifiedPurchase(userId, { reviewType, productId, orderId, hotelId }) {
  try {
    if (reviewType === "product" && productId) {
      const order = await Order.findOne({
        user: userId,
        status: "Delivered",
        "items.productId": productId,
      }).lean();
      return !!order;
    }
    if (reviewType === "order" || reviewType === "delivery") {
      const order = await Order.findOne({
        _id: orderId,
        user: userId,
        status: "Delivered",
      }).lean();
      return !!order;
    }
    if (reviewType === "hotel" && hotelId) {
      const order = await Order.findOne({
        user: userId,
        status: "Delivered",
        "items.hotelId": hotelId,
      }).lean();
      return !!order;
    }
    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/reviews
// Create a new review
// ─────────────────────────────────────────────────────────────
exports.createReview = async (req, res) => {
  try {
    const {
      reviewType,
      productId,
      orderId,
      hotelId,
      rating,
      title,
      body,
      photos = [],
    } = req.body;

    const userId = req.user._id;

    if (!["product", "order", "hotel", "delivery"].includes(reviewType))
      return res.status(400).json({ success: false, message: "Invalid reviewType" });

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: "Rating must be 1–5" });

    if (reviewType === "product" && !productId)
      return res.status(400).json({ success: false, message: "productId required" });

    if ((reviewType === "order" || reviewType === "delivery") && !orderId)
      return res.status(400).json({ success: false, message: "orderId required" });

    if (reviewType === "hotel" && !hotelId)
      return res.status(400).json({ success: false, message: "hotelId required" });

    if (photos.length > 5)
      return res.status(400).json({ success: false, message: "Max 5 photos" });

    const isVerifiedPurchase = await checkVerifiedPurchase(userId, {
      reviewType, productId, orderId, hotelId,
    });

    if (!isVerifiedPurchase)
      return res.status(403).json({
        success: false,
        message: "You can only review items from your delivered orders",
      });

    const review = await Review.create({
      reviewType,
      product: productId || null,
      order: orderId || null,
      hotel: hotelId || null,
      user: userId,
      rating: Number(rating),
      title: title?.trim() || "",
      body: body?.trim() || "",
      photos,
      isVerifiedPurchase,
      status: "pending",
    });

    if (reviewType === "product" && productId) {
      await updateProductRating(productId);
    }

    return res.status(201).json({ success: true, review });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this item",
      });
    }
    console.error("❌ CREATE REVIEW:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reviews/product/:productId
// Paginated, sorted, filterable product reviews + summary
// ─────────────────────────────────────────────────────────────
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 10,
      sort = "recent",   // recent | helpful | rating_high | rating_low
      rating,              // filter by star
      photos = "false",    // "true" = photo reviews only
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query = { product: productId, status: "approved", isDeleted: false };

    if (rating) query.rating = Number(rating);
    if (photos === "true") query.photos = { $exists: true, $not: { $size: 0 } };

    const sortMap = {
      recent: { createdAt: -1 },
      helpful: { helpfulCount: -1, createdAt: -1 },
      rating_high: { rating: -1, createdAt: -1 },
      rating_low: { rating: 1, createdAt: -1 },
    };

    const [reviews, total, breakdown] = await Promise.all([
      Review.find(query)
        .sort(sortMap[sort] || sortMap.recent)
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "name profilePhoto")
        .lean(),

      Review.countDocuments(query),

      Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(productId),
            status: "approved",
            isDeleted: false,
          },
        },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
    ]);

    // Build { 1:0, 2:0, 3:0, 4:0, 5:0 }
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdown.forEach(({ _id, count }) => { ratingBreakdown[_id] = count; });

    const totalReviews = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);
    const avgRating = totalReviews
      ? (
        Object.entries(ratingBreakdown)
          .reduce((sum, [star, cnt]) => sum + Number(star) * cnt, 0) / totalReviews
      ).toFixed(1)
      : "0.0";

    return res.json({
      success: true,
      reviews,
      summary: {
        avgRating: Number(avgRating),
        totalReviews,
        breakdown: ratingBreakdown,
      },
      pagination: {
        page: Number(page), limit: Number(limit), total,
        pages: Math.ceil(total / Number(limit)),
        hasMore: skip + reviews.length < total,
      },
    });

  } catch (err) {
    console.error("❌ GET PRODUCT REVIEWS:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reviews/order/:orderId
// ─────────────────────────────────────────────────────────────
exports.getOrderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      order: req.params.orderId,
      status: "approved",
      isDeleted: false,
    })
      .populate("user", "name profilePhoto")
      .lean();

    return res.json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reviews/hotel/:hotelId
// ─────────────────────────────────────────────────────────────
exports.getHotelReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "recent" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = { hotel: req.params.hotelId, status: "approved", isDeleted: false };

    const sortMap = {
      recent: { createdAt: -1 },
      helpful: { helpfulCount: -1 },
      rating_high: { rating: -1 },
      rating_low: { rating: 1 },
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort(sortMap[sort] || sortMap.recent)
        .skip(skip).limit(Number(limit))
        .populate("user", "name profilePhoto")
        .lean(),
      Review.countDocuments(query),
    ]);

    return res.json({
      success: true, reviews,
      pagination: { page: Number(page), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reviews/my
// ─────────────────────────────────────────────────────────────
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("product", "name images")
      .populate("order", "orderId total")
      .lean();

    return res.json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reviews/can-review
// ?reviewType=product&productId=xxx&orderId=yyy
// ─────────────────────────────────────────────────────────────
exports.canReview = async (req, res) => {
  try {
    const { reviewType, productId, orderId, hotelId } = req.query;
    const userId = req.user._id;

    const existing = await Review.findOne({
      user: userId,
      reviewType,
      ...(productId && { product: productId }),
      ...(orderId && { order: orderId }),
      ...(hotelId && { hotel: hotelId }),
      isDeleted: false,
    }).lean();

    if (existing) return res.json({ success: true, canReview: false, existing });

    const canReview = await checkVerifiedPurchase(userId, {
      reviewType, productId, orderId, hotelId,
    });

    return res.json({ success: true, canReview });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/reviews/:id
// ─────────────────────────────────────────────────────────────
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id, user: req.user._id, isDeleted: false,
    });

    if (!review)
      return res.status(404).json({ success: false, message: "Review not found" });

    const { rating, title, body, photos } = req.body;

    if (rating) review.rating = Number(rating);
    if (title !== undefined) review.title = title.trim();
    if (body !== undefined) review.body = body.trim();
    if (photos !== undefined) {
      if (photos.length > 5)
        return res.status(400).json({ success: false, message: "Max 5 photos" });
      review.photos = photos;
    }

    await review.save();
    if (review.product) await updateProductRating(review.product);

    return res.json({ success: true, review });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/reviews/:id  (soft delete)
// ─────────────────────────────────────────────────────────────
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review)
      return res.status(404).json({ success: false, message: "Review not found" });

    review.isDeleted = true;
    await review.save();
    if (review.product) await updateProductRating(review.product);

    return res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/reviews/:id/helpful  — toggle vote
// ─────────────────────────────────────────────────────────────
exports.toggleHelpful = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id, isDeleted: false, status: "approved",
    });

    if (!review)
      return res.status(404).json({ success: false, message: "Review not found" });

    const userId = req.user._id.toString();
    const alreadyIdx = review.helpfulVotes.findIndex(
      (v) => v.user.toString() === userId
    );

    if (alreadyIdx > -1) {
      review.helpfulVotes.splice(alreadyIdx, 1); // un-vote
    } else {
      review.helpfulVotes.push({ user: req.user._id });
    }

    review.helpfulCount = review.helpfulVotes.length;
    await review.save();

    return res.json({
      success: true,
      helpfulCount: review.helpfulCount,
      voted: alreadyIdx === -1,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/reviews/:id/reply  (admin only)
// ─────────────────────────────────────────────────────────────
exports.replyToReview = async (req, res) => {
  try {
    const isAdmin = !!req.admin || !!req.user?.isAdmin;
    if (!isAdmin)
      return res.status(403).json({ success: false, message: "Admin access required" });

    const { message } = req.body;
    if (!message?.trim())
      return res.status(400).json({ success: false, message: "Reply message required" });

    const review = await Review.findOne({ _id: req.params.id, isDeleted: false });
    if (!review)
      return res.status(404).json({ success: false, message: "Review not found" });

    review.reply = {
      message: message.trim(),
      repliedBy: req.user?._id || req.admin?._id,
      name: "Freshlaa Team",
      repliedAt: new Date(),
    };

    await review.save();
    try {
      await notifyUser({
        userId: review.user,
        type: "REVIEW",
        pushData: {
          title: "Freshlaa replied to your review! 💬",
          body: message.trim().length > 100
            ? message.trim().slice(0, 97) + "..."
            : message.trim(),
          deepLinkType: "GENERIC",
          deepLinkParams: {
            screen: "MyReviews",
            reviewId: review._id.toString(),
          },
        },
      });
    } catch (notifErr) {
      console.error("⚠️ Review reply notification failed:", notifErr.message);
    }
    return res.json({ success: true, review });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reviews/home  — top reviews for home screen
// ─────────────────────────────────────────────────────────────
exports.getHomeReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      status: "approved",
      isDeleted: false,
      isVerifiedPurchase: true,
      rating: { $gte: 4 },
      body: { $ne: "" },
    })
      .sort({ helpfulCount: -1, rating: -1, createdAt: -1 })
      .limit(10)
      .populate("user", "name profilePhoto")
      .populate("product", "name images")
      .lean();

    return res.json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/reviews
// ─────────────────────────────────────────────────────────────
exports.adminGetReviews = async (req, res) => {
  try {

    const {
      page = 1, limit = 20,
      status, reviewType, minRating, maxRating, withPhotos,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query = { isDeleted: false };

    if (status) query.status = status;
    if (reviewType) query.reviewType = reviewType;
    if (withPhotos === "true") query.photos = { $exists: true, $not: { $size: 0 } };
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) query.rating.$gte = Number(minRating);
      if (maxRating) query.rating.$lte = Number(maxRating);
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit))
        .populate("user", "name phone email")
        .populate("product", "name images")
        .populate("order", "orderId total")
        .lean(),
      Review.countDocuments(query),
    ]);

    return res.json({
      success: true, reviews,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN — PATCH /api/admin/reviews/:id/status
// ─────────────────────────────────────────────────────────────
exports.adminUpdateReviewStatus = async (req, res) => {
  try {
    const isAdmin = !!req.admin || !!req.user?.isAdmin;
    if (!isAdmin)
      return res.status(403).json({ success: false, message: "Admin access required" });

    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ success: false, message: "Status must be approved or rejected" });

    const review = await Review.findById(req.params.id);
    if (!review)
      return res.status(404).json({ success: false, message: "Review not found" });

    review.status = status;
    if (status === "rejected" && rejectionReason) review.rejectionReason = rejectionReason;

    await review.save();
    if (review.product) await updateProductRating(review.product);

    return res.json({ success: true, review });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};