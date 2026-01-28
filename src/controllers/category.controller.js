const Category = require("../models/Category");

/**
 * 1️⃣ GET MAIN CATEGORIES (HOME / ZEPTO GRID)
 * GET /api/categories
 */
exports.getMainCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      $or: [
        { parentSlug: null },
        { parentSlug: { $exists: false } }, // 🔥 THIS FIXES IT
      ],
    }).sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("getMainCategories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
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
