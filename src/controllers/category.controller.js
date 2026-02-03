const mongoose = require("mongoose");
const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");
const Product = require("../models/Product");

/* ================= HOME SECTIONS (ZEPTO HOME) ================= */
const getZeptoCategories = async (req, res) => {
  try {
    const sections = await CategorySection.find({
      isActive: true, // ✅ use isActive
    })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: sections.map((s) => ({
        _id: s._id,
        title: s.title,
        image: s.image || null,
        layout: s.layout || "grid",
        columns: s.columns || 3,
      })),
    });
  } catch (err) {
    console.error("getZeptoCategories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load home sections",
    });
  }
};

/* ================= SUB-CATEGORIES BY SECTION ================= */
const getCategoriesBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.json({ success: true, data: [] });
    }

    const categories = await Category.find({
      sectionId,
      isActive: true,
      parentSlug: null, // ✅ top-level categories only
    })
      .sort({ order: 1 })
      .lean();

    res.json({ success: true, data: categories });
  } catch (err) {
    console.error("getCategoriesBySection error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load sub-categories",
    });
  }
};

/* ================= PRODUCTS BY SECTION + CATEGORY ================= */
const getProductsBySection = async (req, res) => {
  try {
    const { sectionId, subCategory } = req.query;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.json({ success: true, data: [] });
    }

    // 1️⃣ Find categories under section
    const categoryQuery = {
      sectionId,
      isActive: true,
    };

    // ✅ Use slug instead of title
    if (subCategory && subCategory !== "top-picks") {
      categoryQuery.slug = subCategory;
    }

    const categories = await Category.find(categoryQuery).lean();

    if (!categories.length) {
      return res.json({ success: true, data: [] });
    }

    // 2️⃣ Extract category slugs
    const categorySlugs = categories.map((c) => c.slug);

    // 3️⃣ Find products
    const products = await Product.find({
      category: { $in: categorySlugs }, // category stored as slug
      isActive: true,
      stock: { $gt: 0 },
    })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error("getProductsBySection error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load products",
    });
  }
};

module.exports = {
  getZeptoCategories,
  getCategoriesBySection,
  getProductsBySection,
};
