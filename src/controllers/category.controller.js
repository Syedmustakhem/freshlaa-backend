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
/* ================= SUB-CATEGORIES BY SECTION ================= */
const getCategoriesBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.json({ success: true, data: [] });
    }

    const categories = await Category.find({
      sectionId: new mongoose.Types.ObjectId(sectionId),
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });
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

    // find categories under section
    const categoryQuery = {
      sectionId: new mongoose.Types.ObjectId(sectionId),
      isActive: true,
    };

    if (subCategory) {
      categoryQuery.slug = subCategory;
    }

    const categories = await Category.find(categoryQuery).lean();

    if (!categories.length) {
      return res.json({ success: true, data: [] });
    }

    const slugs = categories.map(c => c.slug);

    const products = await Product.find({
      category: { $in: slugs }, // MUST MATCH SLUG
      isActive: true,
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
/* ================= TOP LEVEL CATEGORIES ================= */
const getTopCategoriesWithPreview = async (req, res) => {
  try {
    const categories = await Category.find({
      parentSlug: null,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    const result = [];

    for (const cat of categories) {
      const products = await Product.find({
        subCategory: cat.slug,
        isActive: true,
      })
        .limit(4)
        .select("images")
        .lean();

      const previewImages = products
        .map(p => p.images?.[0])
        .filter(Boolean);

      result.push({
        _id: cat._id,
        title: cat.title,
        slug: cat.slug,
        images: previewImages,
        count: products.length,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Top categories preview error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load top categories",
    });
  }
};


module.exports = {
  getZeptoCategories,
  getCategoriesBySection,
  getProductsBySection,
  getTopCategoriesWithPreview,   // 🔥 add this
};

