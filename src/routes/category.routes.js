const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// GET all unique categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", {
      isActive: true,
    });

    res.json({
      success: true,
      categories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});

module.exports = router;
