// src/routes/cartRecovery.routes.js

const express  = require("express");
const router   = express.Router();
const {
  syncAbandonedCart,
  markRecovered,
  getStats,
} = require("../controllers/cartRecovery.controller");

// POST /api/cart-recovery/sync       — frontend calls on every cart change
router.post("/sync",      syncAbandonedCart);

// POST /api/cart-recovery/recovered  — frontend calls after order placed
router.post("/recovered", markRecovered);

// GET  /api/cart-recovery/stats      — admin dashboard
router.get("/stats",      getStats);

module.exports = router;