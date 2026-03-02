const Brand = require("../models/brand.model");

/* ─── GET brand config (App fetches this daily) ─── */
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findOne({ isActive: true })
      .populate("sections.products.productId", "name images variants category isFeatured")
      .sort({ updatedAt: -1 });

    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand config not found" });
    }

    res.json({ success: true, data: brand });
  } catch (err) {
    console.error("getBrand error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ─── CREATE or REPLACE brand config (Admin) ─── */
exports.upsertBrand = async (req, res) => {
  try {
    const { tabIcon, tabLabel, sections } = req.body;

    // Replace active brand config (single source of truth)
    await Brand.deleteMany({});
    const brand = await Brand.create({ tabIcon, tabLabel, sections, isActive: true });

    res.status(201).json({ success: true, data: brand });
  } catch (err) {
    console.error("upsertBrand error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ─── UPDATE just the tab icon ─── */
exports.updateTabIcon = async (req, res) => {
  try {
    const { tabIcon } = req.body;
    const brand = await Brand.findOneAndUpdate(
      {},
      { tabIcon },
      { new: true }
    );
    res.json({ success: true, data: brand });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};