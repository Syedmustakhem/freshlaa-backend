const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware"); // ✅ FUNCTION

const {
  getCart,
  syncCart,
  clearCart,
} = require("../controllers/cart.controller");

/* GET CART */
router.get("/", protect, getCart);

/* SYNC CART */
router.post("/sync", protect, syncCart);

/* CLEAR CART */
router.delete("/clear", protect, clearCart);

module.exports = router;