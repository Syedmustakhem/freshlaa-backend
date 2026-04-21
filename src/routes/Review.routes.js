/**
 * review.routes.js
 * Add to server.js:
 *   app.use("/api/reviews", require("./routes/review.routes"));
 */
const router = require("express").Router();
const ctrl = require("../controllers/review.controller");
const auth = require("../middlewares/auth.middleware");
const adminAuth = require("../middlewares/adminAuth");

// ── Public routes
router.get("/home", ctrl.getHomeReviews);
router.get("/product/:productId", ctrl.getProductReviews);
router.get("/hotel/:hotelId", ctrl.getHotelReviews);
router.get("/order/:orderId", ctrl.getOrderReviews);

// ── Admin routes (use adminAuth, NOT user auth)
router.get("/admin/all", adminAuth, ctrl.adminGetReviews);
router.patch("/admin/:id/status", adminAuth, ctrl.adminUpdateReviewStatus);
router.post("/:id/reply", adminAuth, ctrl.replyToReview);

// ── Auth required (user routes)
router.use(auth);
router.get("/my", ctrl.getMyReviews);
router.get("/can-review", ctrl.canReview);
router.post("/", ctrl.createReview);
router.put("/:id", ctrl.updateReview);
router.delete("/:id", ctrl.deleteReview);
router.post("/:id/helpful", ctrl.toggleHelpful);

module.exports = router;

