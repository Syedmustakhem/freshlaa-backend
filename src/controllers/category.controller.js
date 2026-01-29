const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");
const CategoryBanner = require("../models/CategoryBanner");
const Product = require("../models/Product");

/* ================= ZEPTO HOME ================= */
const getZeptoCategories = async (req, res) => {
  try {
    const sections = await CategorySection.find({
      $or: [{ visible: true }, { visible: { $exists: false } }],
    })
      .sort({ order: 1 })
      .lean();

    const sectionIds = sections.map((s) => s._id);

    const categories = await Category.find({
      sectionId: { $in: sectionIds },
      $or: [{ visible: true }, { visible: { $exists: false } }],
    })
      .sort({ order: 1 })
      .lean();

    const grouped = sections.map((section) => ({
      _id: section._id,
      title: section.title,
      layout: section.layout || "grid",
      columns: section.columns || 3,
      categories: categories.filter(
        (c) => String(c.sectionId) === String(section._id)
      ),
    }));

    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to load Zepto categories",
    });
  }
};

/* ================= SECTION LIST ================= */
const getCategoriesBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const categories = await Category.find({
      sectionId,
    }).sort({ order: 1 });

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= CATEGORY LANDING ================= */
const getCategoryLanding = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      $or: [{ visible: true }, { visible: { $exists: false } }],
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const banners = await CategoryBanner.find({
      categorySlug: slug,
      isActive: true,
    }).sort({ order: 1 });

    const products = await Product.find({
      category: slug,
      isActive: true,
      stock: { $gt: 0 },
    });

    res.json({
      success: true,
      data: { category, banners, products },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to load category landing",
    });
  }
};

/* ✅ EXPORT EVERYTHING TOGETHER */
module.exports = {
  getZeptoCategories,
  getCategoriesBySection,
  getCategoryLanding,
};
