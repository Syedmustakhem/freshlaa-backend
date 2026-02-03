const Category = require("../../models/Category");

exports.getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("sectionId", "title slug")
      .sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("getAdminCategories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load categories",
    });
  }
};
