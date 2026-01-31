const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");
const Product = require("../models/Product");

/* ================= HOME SECTIONS (ZEPTO HOME) ================= */
const getZeptoCategories = async (req, res) => {
  try {
    const sections = await CategorySection.find({
      visible: true,
    })
      .sort({ order: 1 })
      .lean();

    // Home ONLY needs sections now
    res.json({
      success: true,
      data: sections.map((s) => ({
        _id: s._id,
        title: s.title,
        image: s.image,
        layout: s.layout || "grid",
        columns: s.columns || 3,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to load home sections",
    });
  }
};

/* ================= SUB-CATEGORIES BY SECTION (LEFT RAIL) ================= */
const getCategoriesBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const categories = await Category.find({
      sectionId,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load sub-categories",
    });
  }
};

/* ================= PRODUCTS BY SECTION + SUBCATEGORY ================= */
/* ================= PRODUCTS BY SECTION + SUBCATEGORY ================= */
const getProductsBySection = async (req, res) => {
  try {
    const { sectionId, subCategory } = req.query;

    if (!sectionId) {
      return res.json({ success: true, data: [] });
    }

    // 1️⃣ Find categories under this section
    const categoryQuery = {
      sectionId,
      isActive: true,
    };

    if (subCategory && subCategory !== "Top Picks") {
      categoryQuery.title = subCategory;
    }

    const categories = await Category.find(categoryQuery).lean();

    // 2️⃣ Extract category slugs
    const categorySlugs = categories.map(c => c.slug);

    if (categorySlugs.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 3️⃣ Find products by category slug
    const products = await Product.find({
      category: { $in: categorySlugs },
      isActive: true,
      stock: { $gt: 0 },
    }).lean();

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


/* ❌ OLD CATEGORY LANDING (DEPRECATED) */
/*
const getCategoryLanding = async (req, res) => {};
*/

module.exports = {
  getZeptoCategories,
  getCategoriesBySection,
  getProductsBySection,
};
