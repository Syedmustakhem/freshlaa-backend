const express = require("express");
const router = express.Router();

const HomeSection = require("../models/HomeSection");
const adminAuth = require("../middlewares/adminAuth");
const Product = require("../models/Product");

/* =====================================================
   PUBLIC API (USED BY MOBILE APP)
   GET /api/home-layout
===================================================== */
router.get("/home-layout", async (req, res) => {
  try {
    const sections = await HomeSection.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    // 🔥 Enrich CATEGORY sections with products
    for (const section of sections) {
      if (section.type === "CATEGORY" && section.data?.categorySlug) {
        const products = await Product.find({
          categorySlug: section.data.categorySlug,
          active: true,
        })
          .limit(6) // 👈 exactly your grid size
          .select("name price mrp images");

        section.data.products = products;
      }
    }

    return res.json({
      success: true,
      sections: sections.map((s) => ({
        id: s._id,
        type: s.type,
        data: s.data || {},
      })),
    });
  } catch (err) {
    console.error("Home layout error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load home layout",
    });
  }
});


/* =====================================================
   ADMIN APIs (PROTECTED)
===================================================== */

/* CREATE SECTION */
router.post(
  "/admin/home-section",
  adminAuth,
  async (req, res) => {
    try {
      const { type, order, data } = req.body;

      const section = await HomeSection.create({
        type,
        order,
        data: data || {},
      });

      res.json({ success: true, section });
    } catch (err) {
      res.status(500).json({ success: false, message: "Create failed" });
    }
  }
);

/* UPDATE SECTION */
router.put(
  "/admin/home-section/:id",
  adminAuth,
  async (req, res) => {
    try {
      const { type, order, data } = req.body; // ← destructure, don't save whole body

      const section = await HomeSection.findByIdAndUpdate(
        req.params.id,
        { type, order, data },  // ← only save valid fields
        { new: true }
      );

      if (!section) {
        return res.status(404).json({ success: false, message: "Section not found" });
      }

      res.json({ success: true, section });
    } catch (err) {
      console.error("Update section error:", err);
      res.status(500).json({ success: false, message: "Update failed" });
    }
  }
);

/* TOGGLE ENABLE / DISABLE */
router.patch(
  "/admin/home-section/:id/toggle",
  adminAuth,
  async (req, res) => {
    const section = await HomeSection.findById(req.params.id);
    section.isActive = !section.isActive;
    await section.save();

    res.json({ success: true, section });
  }
);

/* REORDER SECTIONS */
router.put(
  "/admin/home-section/reorder",
  adminAuth,
  async (req, res) => {
    const { order } = req.body;
    // order = [{ id, order }]

    const bulk = order.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    }));

    await HomeSection.bulkWrite(bulk);
    res.json({ success: true });
  }
);
// ================= ADMIN: GET ALL SECTIONS =================
router.get(
  "/admin/home-layout",
  adminAuth,
  async (req, res) => {
    const sections = await HomeSection.find()
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      sections: sections.map((s) => ({
        id: s._id,
        type: s.type,
        isActive: s.isActive,
        data: s.data || {},
      })),
    });
  }
);

module.exports = router;
