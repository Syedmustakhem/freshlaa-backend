const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// GET all unique categories
// GET products by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({
      category: category,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("Category products error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products by category",
    });
  }
});


module.exports = router;
