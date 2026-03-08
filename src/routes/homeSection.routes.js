const express = require("express");
const router = express.Router();

const HomeSection = require("../models/HomeSection");
const OffersPage  = require("../models/OffersPage");
const adminAuth   = require("../middlewares/adminAuth");
const Product     = require("../models/Product");

/* =====================================================
   HELPER — resolve productIds → full product objects
===================================================== */
async function enrichSections(sections = []) {
  return Promise.all(
    sections.map(async (sec) => {
      if (!sec.productIds?.length) return { ...sec, products: [] };

      const products = await Product.find({
        _id:    { $in: sec.productIds },
        active: true,
      })
        .select("name images variants category brand rating reviewCount")
        .lean();

      // Keep admin-defined pin order
      const map     = Object.fromEntries(products.map((p) => [String(p._id), p]));
      const ordered = sec.productIds.map((id) => map[String(id)]).filter(Boolean);

      return {
        title:    sec.title    || "",
        subtitle: sec.subtitle || "",
        badge:    sec.badge    || "",
        products: ordered,
      };
    })
  );
}

/* =====================================================
   PUBLIC API — GET /api/home-layout
===================================================== */
router.get("/home-layout", async (req, res) => {
  try {
    const sections = await HomeSection.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    for (const section of sections) {
      if (section.type === "CATEGORY" && section.data?.categorySlug) {
        const products = await Product.find({
          categorySlug: section.data.categorySlug,
          active: true,
        })
          .limit(6)
          .select("name price mrp images");

        section.data.products = products;
      }
    }

    return res.json({
      success: true,
      sections: sections.map((s) => ({
        id:   s._id,
        type: s.type,
        data: s.data || {},
      })),
    });
  } catch (err) {
    console.error("Home layout error:", err);
    return res.status(500).json({ success: false, message: "Failed to load home layout" });
  }
});

/* =====================================================
   ADMIN — GET /api/home-layout/admin/home-layout
===================================================== */
router.get("/admin/home-layout", adminAuth, async (req, res) => {
  try {
    const sections = await HomeSection.find().sort({ order: 1 }).lean();
    return res.json({
      success: true,
      sections: sections.map((s) => ({
        id:       s._id,
        type:     s.type,
        isActive: s.isActive,
        data:     s.data || {},
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch sections" });
  }
});

/* =====================================================
   ADMIN — POST /api/home-layout/admin/home-section
===================================================== */
router.post("/admin/home-section", adminAuth, async (req, res) => {
  try {
    const { type, order, data } = req.body;
    const section = await HomeSection.create({ type, order, data: data || {} });
    return res.json({ success: true, section });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Create failed" });
  }
});

/* =====================================================
   ADMIN — PUT /api/home-layout/admin/home-section/:id
===================================================== */
router.put("/admin/home-section/:id", adminAuth, async (req, res) => {
  try {
    const { type, order, data } = req.body;
    const section = await HomeSection.findByIdAndUpdate(
      req.params.id,
      { type, order, data },
      { new: true }
    );
    if (!section) {
      return res.status(404).json({ success: false, message: "Section not found" });
    }
    return res.json({ success: true, section });
  } catch (err) {
    console.error("Update section error:", err);
    return res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* =====================================================
   ADMIN — PATCH /api/home-layout/admin/home-section/:id/toggle
===================================================== */
router.patch("/admin/home-section/:id/toggle", adminAuth, async (req, res) => {
  try {
    const section = await HomeSection.findById(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: "Not found" });
    section.isActive = !section.isActive;
    await section.save();
    return res.json({ success: true, section });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Toggle failed" });
  }
});

/* =====================================================
   ADMIN — PUT /api/home-layout/admin/home-section/reorder
===================================================== */
router.put("/admin/home-section/reorder", adminAuth, async (req, res) => {
  try {
    const { order } = req.body;
    const bulk = order.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    }));
    await HomeSection.bulkWrite(bulk);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Reorder failed" });
  }
});


/* ┌─────────────────────────────────────────────────────┐
   │            OFFERS PAGE ROUTES                       │
   │  Mounted on the same router — no new file needed    │
   └─────────────────────────────────────────────────────┘ */

/* =====================================================
   PUBLIC — GET /api/home-layout/offers-page/:slug
   Called by the mobile OffersScreen
===================================================== */
router.get("/offers-page/:slug", async (req, res) => {
  try {
    const page = await OffersPage.findOne({
      slug:     req.params.slug.toLowerCase().trim(),
      isActive: true,
    }).lean();

    if (!page) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const sections = await enrichSections(page.sections);

    return res.json({
      success:        true,
      slug:           page.slug,
      banner:         page.banner,
      title:          page.title,
      subtitle:       page.subtitle,
      countdownHours: page.countdownHours,
      sections,
    });
  } catch (err) {
    console.error("OffersPage GET error:", err);
    return res.status(500).json({ success: false, message: "Failed to load offer page" });
  }
});

/* =====================================================
   ADMIN — GET /api/home-layout/admin/offers-page/all
   List all offer pages
===================================================== */
router.get("/admin/offers-page/all", adminAuth, async (req, res) => {
  try {
    const pages = await OffersPage.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, pages });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch pages" });
  }
});

/* =====================================================
   ADMIN — GET /api/home-layout/admin/offers-page/:slug
   Load raw page for editor (productIds, not enriched)
===================================================== */
router.get("/admin/offers-page/:slug", adminAuth, async (req, res) => {
  try {
    const page = await OffersPage.findOne({
      slug: req.params.slug.toLowerCase().trim(),
    }).lean();

    if (!page) {
      // Return empty scaffold — editor will upsert on save
      return res.json({
        success: true,
        page: {
          slug:           req.params.slug,
          banner:         "",
          title:          "",
          subtitle:       "",
          countdownHours: 6,
          isActive:       true,
          sections:       [],
        },
      });
    }

    return res.json({ success: true, page });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch page" });
  }
});

/* =====================================================
   ADMIN — PUT /api/home-layout/admin/offers-page/:slug
   Create or update (upsert) an offer page
===================================================== */
router.put("/admin/offers-page/:slug", adminAuth, async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const { banner, title, subtitle, countdownHours, isActive, sections } = req.body;

    const cleanSections = (sections || []).map((sec) => ({
      title:      sec.title      || "",
      subtitle:   sec.subtitle   || "",
      badge:      sec.badge      || "",
      productIds: (sec.productIds || []).filter(Boolean),
    }));

    const page = await OffersPage.findOneAndUpdate(
      { slug },
      {
        slug,
        banner:         banner         ?? "",
        title:          title          ?? "",
        subtitle:       subtitle       ?? "",
        countdownHours: countdownHours ?? 6,
        isActive:       isActive       !== undefined ? isActive : true,
        sections:       cleanSections,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({ success: true, page });
  } catch (err) {
    console.error("OffersPage PUT error:", err);
    return res.status(500).json({ success: false, message: "Save failed", error: err.message });
  }
});

/* =====================================================
   ADMIN — PATCH /api/home-layout/admin/offers-page/:slug/toggle
===================================================== */
router.patch("/admin/offers-page/:slug/toggle", adminAuth, async (req, res) => {
  try {
    const page = await OffersPage.findOne({ slug: req.params.slug.toLowerCase().trim() });
    if (!page) return res.status(404).json({ success: false, message: "Not found" });
    page.isActive = !page.isActive;
    await page.save();
    return res.json({ success: true, isActive: page.isActive });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Toggle failed" });
  }
});

/* =====================================================
   ADMIN — DELETE /api/home-layout/admin/offers-page/:slug
===================================================== */
router.delete("/admin/offers-page/:slug", adminAuth, async (req, res) => {
  try {
    await OffersPage.findOneAndDelete({ slug: req.params.slug.toLowerCase().trim() });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
});

module.exports = router;