const Banner = require("../models/Banner");

/* GET BANNERS */
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch banners" });
  }
};

/* CREATE BANNER */
exports.createBanner = async (req, res) => {
  try {
    const banner = new Banner(req.body);
    await banner.save();
    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ message: "Failed to create banner" });
  }
};

/* UPDATE BANNER */
exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: "Failed to update banner" });
  }
};

/* DELETE BANNER */
exports.deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete banner" });
  }
};
