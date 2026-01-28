const CategoryBanner = require("../models/CategoryBanner");

exports.getCategoryBanners = async (req, res) => {
  const { slug } = req.params;

  const banners = await CategoryBanner.find({
    categorySlug: slug,
    isActive: true,
  }).sort({ order: 1 });

  res.json({ success: true, data: banners });
};
