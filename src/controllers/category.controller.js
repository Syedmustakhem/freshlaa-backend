const Category = require("../models/Category");

/**
 * 1️⃣ GET MAIN CATEGORIES (HOME / ZEPTO GRID)
 * GET /api/categories
 */
exports.getMainCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      parentSlug: null,
      isActive: true,
    }).sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2️⃣ GET SUB-CATEGORIES (CATEGORY LANDING)
 * GET /api/categories/:slug
 */
exports.getSubCategories = async (req, res) => {
  try {
    const { slug } = req.params;

    const categories = await Category.find({
      parentSlug: slug,
      isActive: true,
    }).sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
