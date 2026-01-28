const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");

/* ================= ZEPTO MAIN CATEGORIES ================= */
exports.getZeptoCategories = async (req, res) => {
  try {
    const sections = await CategorySection.find({
      $or: [
        { visible: true },
        { visible: { $exists: false } }, // 👈 important
      ],
    })
      .sort({ order: 1 })
      .lean();

    const sectionIds = sections.map((s) => s._id);

    const categories = await Category.find({
      sectionId: { $in: sectionIds },
      $or: [
        { visible: true },
        { visible: { $exists: false } }, // 👈 important
      ],
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
    res.json({
      success: true,
      data: grouped,
    });
  } catch (err) {
    console.error("Zepto categories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load Zepto categories",
    });
  }
};
exports.getCategoriesBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const categories = await Category.find({
      sectionId,
    }).sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

