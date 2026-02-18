const mongoose = require("mongoose");
const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");
const Product = require("../models/Product");

/* =========================================================
   1️⃣ ZEPTO HOME SECTIONS
========================================================= */
const getZeptoCategories = async (req, res) => {
  try {
    const sections = await CategorySection.find({
      isActive: true,
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

/* =========================================================
   2️⃣ SUB-CATEGORIES BY SECTION (ZEPTO ONLY)
========================================================= */
const getCategoriesBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.json({ success: true, data: [] });
    }

    const categories = await Category.find({
      sectionId: new mongoose.Types.ObjectId(sectionId),
      displayType: "section", // 🔥 IMPORTANT
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

/* =========================================================
   3️⃣ PRODUCTS BY SECTION + CATEGORY (ZEPTO ONLY)
========================================================= */
const getProductsBySection = async (req, res) => {
  try {
    const { sectionId, subCategory } = req.query;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.json({ success: true, data: [] });
    }

    const categoryQuery = {
      sectionId: new mongoose.Types.ObjectId(sectionId),
      displayType: "section", // 🔥 PREVENT MIXING
      isActive: true,
    };

    if (subCategory) {
      categoryQuery.slug = subCategory;
    }

    const categories = await Category.find(categoryQuery).lean();

    if (!categories.length) {
      return res.json({ success: true, data: [] });
    }

    const slugs = categories.map((c) => c.slug);

    const products = await Product.find({
      category: { $in: slugs },
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

/* =========================================================
   4️⃣ TOP PREVIEW CATEGORIES (BLINK STYLE)
========================================================= */
const getTopCategoriesWithPreview = async (req, res) => {
  try {
    // 1️⃣ Only top categories
    const categories = await Category.find({
      displayType: "top",   // 🔥 ONLY TOP
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    if (!categories.length) {
      return res.json({ success: true, data: [] });
    }

    const slugs = categories.map((c) => c.slug);

    // 2️⃣ Get real product counts + preview images
    const productStats = await Product.aggregate([
      {
        $match: {
          subCategory: { $in: slugs },
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$subCategory",
          count: { $sum: 1 },
          previewImages: {
            $push: { $arrayElemAt: ["$images", 0] },
          },
        },
      },
    ]);

    const statsMap = {};
    productStats.forEach((stat) => {
      statsMap[stat._id] = {
        count: stat.count,
        previewImages: stat.previewImages.slice(0, 4),
      };
    });

    // 3️⃣ Build response
    const result = categories.map((cat) => {
      const stats = statsMap[cat.slug];

      let previewImages =
        stats?.previewImages?.filter(Boolean) || [];

      // Fallback to category images if no products
      if (previewImages.length === 0 && cat.images?.length) {
        previewImages = cat.images.slice(0, 4);
      }

      return {
        _id: cat._id,
        title: cat.title,
        slug: cat.slug,
        images: previewImages,
        count: stats?.count || 0,
      };
    });

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

/* =========================================================
   5️⃣ CREATE CATEGORY (ADMIN)
========================================================= */
const createCategory = async (req, res) => {
  try {
    const {
      title,
      slug,
      sectionId,
      isActive,
      displayType,
      images,
    } = req.body;

    const category = await Category.create({
      title,
      slug,
      sectionId: sectionId || null,
      displayType: displayType || "section",
      isActive,
      images: images || [],
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};
/* =========================================================
   6️⃣ DISPLAY CATEGORIES (FEATURED / FESTIVAL / TRENDING)
========================================================= */
const getDisplayCategories = async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) {
      return res.json({ success: true, data: [] });
    }

    const categories = await Category.find({
      displayType: type,   // 🔥 featured / festival / trending
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("getDisplayCategories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load display categories",
    });
  }
};

module.exports = {
  getZeptoCategories,
  getCategoriesBySection,
  getProductsBySection,
  getTopCategoriesWithPreview,
  createCategory,
  getDisplayCategories, // ✅ ADD THIS
};
