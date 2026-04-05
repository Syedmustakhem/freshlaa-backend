/**
 * review.routes.js
 * Add to server.js:
 *   app.use("/api/reviews", require("./routes/review.routes"));
 */
const router = require("express").Router();
const ctrl   = require("../controllers/review.controller");
const auth   = require("../middlewares/auth.middleware"); // your existing auth middleware

// ── Public routes
router.get("/home",               ctrl.getHomeReviews);       // home screen widget
router.get("/product/:productId", ctrl.getProductReviews);    // product detail page
router.get("/hotel/:hotelId",     ctrl.getHotelReviews);      // restaurant page
router.get("/order/:orderId",     ctrl.getOrderReviews);      // order tracking page

// ── Auth required
router.use(auth);
router.get("/my",                 ctrl.getMyReviews);         // my reviews tab
router.get("/can-review",         ctrl.canReview);            // check before showing button
router.post("/",                  ctrl.createReview);         // submit review
router.put("/:id",                ctrl.updateReview);         // edit review
router.delete("/:id",             ctrl.deleteReview);         // delete review
router.post("/:id/helpful", ctrl.toggleHelpful);        // helpful vote

// ── Admin (controller checks isAdmin internally)
router.post("/:id/reply",         ctrl.replyToReview);
router.get("/admin/all",          ctrl.adminGetReviews);
router.patch("/admin/:id/status", ctrl.adminUpdateReviewStatus);

module.exports = router;
