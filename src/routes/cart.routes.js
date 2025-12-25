const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

const {
  getCart,
  syncCart,
  clearCart,
} = require("../controllers/cart.controller");

router.get("/", auth, getCart);
router.post("/sync", auth, syncCart);
router.delete("/clear", auth, clearCart);

module.exports = router;