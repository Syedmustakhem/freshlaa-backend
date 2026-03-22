// src/routes/rider.routes.js
const express    = require("express");
const router     = express.Router();
const riderAuth  = require("../middlewares/riderAuth");
const adminAuth  = require("../middlewares/adminAuth");
const protect    = require("../middlewares/auth.middleware");
const ctrl       = require("../controllers/rider.controller");

/* ── Public ── */
router.post("/login", ctrl.login);

/* ── Rider protected ── */
router.get("/me",                    riderAuth, ctrl.getMe);
router.put("/online",                riderAuth, ctrl.toggleOnline);
router.put("/location",              riderAuth, ctrl.updateLocation);
router.get("/orders",                riderAuth, ctrl.getMyOrders);
router.get("/orders/active",         riderAuth, ctrl.getActiveOrders);
router.get("/orders/:id",            riderAuth, ctrl.getOrderById);
router.post("/orders/:id/verify-otp",riderAuth, ctrl.verifyOTP);
router.get("/earnings",              riderAuth, ctrl.getEarnings);

/* ── Admin only ── */
router.post("/admin/create",         adminAuth, ctrl.adminCreateRider);
router.get("/admin/all",             adminAuth, ctrl.adminGetRiders);
router.put("/admin/:id/approve",     adminAuth, ctrl.adminApproveRider);

module.exports = router;