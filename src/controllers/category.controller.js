const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");

exports.getZeptoCategories = async (req, res) => {
  try {
    const sections = await CategorySection
      .find({ visible: true })
      .sort({ order: 1 })
      .lean();

    const result = [];

    for (const section of sections) {
      const categories = await Category
        .find({
          sectionId: section._id,
          visible: true
        })
        .sort({ order: 1 })
        .lean();

      result.push({
        sectionTitle: section.title,
        layout: "grid",
        columns: section.columns || 3,
        categories: categories.map(c => ({
          id: c._id,
          title: c.title || c.name,
          slug: c.slug,
          image: c.image
        }))
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
