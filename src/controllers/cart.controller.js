// src/controllers/cart.controller.js

const Cart = require("../models/Cart");

/* ─────────────────────────────────────────
   GET /api/cart
   Returns the logged-in user's cart
───────────────────────────────────────── */
async function getCart(req, res) {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .lean();

    if (!cart) return res.json({ success: true, data: [] });

    res.json({ success: true, data: cart.items || [] });
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ success: false, message: "Failed to get cart" });
  }
}

/* ─────────────────────────────────────────
   POST /api/cart/sync
   Syncs frontend cart to backend
───────────────────────────────────────── */
async function syncCart(req, res) {
  try {
    const items = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Items must be an array" });
    }

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, items },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("syncCart error:", err);
    res.status(500).json({ success: false, message: "Failed to sync cart" });
  }
}

/* ─────────────────────────────────────────
   DELETE /api/cart/clear
   Clears the user's cart
───────────────────────────────────────── */
async function clearCart(req, res) {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [] },
      { upsert: true }
    );

    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
}

module.exports = { getCart, syncCart, clearCart };