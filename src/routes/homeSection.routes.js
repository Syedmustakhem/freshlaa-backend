const express = require("express");
const router = express.Router();

const HomeSection = require("../models/HomeSection");
const adminAuth = require("../middlewares/adminAuth");

/* =====================================================
   PUBLIC API (USED BY MOBILE APP)
   GET /api/home-layout
===================================================== */
router.get("/home-layout", async (req, res) => {
  try {
    const sections = await HomeSection.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

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
    const section = await HomeSection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, section });
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
