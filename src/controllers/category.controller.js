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
    // 1️⃣ Get top-level active categories
    const categories = await Category.find({
      isActive: true,
      $or: [
        { parentSlug: null },
        { parentSlug: { $exists: false } }
      ]
    })
      .sort({ order: 1 })
      .lean();

    if (!categories.length) {
      return res.json({ success: true, data: [] });
    }

    const slugs = categories.map(c => c.slug);

    // 2️⃣ Get product counts for all categories (single aggregation)
    const productStats = await Product.aggregate([
      {
        $match: {
          subCategory: { $in: slugs },
          isActive: true
        }
      },
      {
        $group: {
          _id: "$subCategory",
          count: { $sum: 1 },
          previewImages: { $push: { $arrayElemAt: ["$images", 0] } }
        }
      }
    ]);

    // Convert to map for fast lookup
    const statsMap = {};
    productStats.forEach(stat => {
      statsMap[stat._id] = {
        count: stat.count,
        previewImages: stat.previewImages.slice(0, 4)
      };
    });

    // 3️⃣ Build final response
    const result = categories.map(cat => {
      const stats = statsMap[cat.slug];

      let previewImages = stats?.previewImages?.filter(Boolean) || [];

      // Fallback to category images if no products
      if (previewImages.length === 0 && cat.images?.length) {
        previewImages = cat.images.slice(0, 4);
      }

      return {
        _id: cat._id,
        title: cat.title,
        slug: cat.slug,
        images: previewImages,
        count: stats?.count || 0   // 🔥 REAL COUNT
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("Top categories preview error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load top categories"
    });
  }
};


const createCategory = async (req, res) => {
  try {
    const { title, slug, sectionId, isActive } = req.body;

    const imageUrls = req.files?.map(
      (file) => `${process.env.BASE_URL}/uploads/${file.filename}`
    );

    const category = await Category.create({
      title,
      slug,
      sectionId,
      isActive,
      images: imageUrls || [],
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

module.exports = {
  getZeptoCategories,
  getCategoriesBySection,
  getProductsBySection,
  getTopCategoriesWithPreview,
  createCategory,   // 🔥 add this
};

