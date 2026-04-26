const express = require("express");
const router  = express.Router();

const HomeSection = require("../models/HomeSection");
const OfferPage   = require("../models/OfferPage");       // ← your existing model
const adminAuth   = require("../middlewares/adminAuth");
const Product     = require("../models/Product");

/* =====================================================
   HELPER — resolve productIds → full Product documents
   Keeps admin-defined pin order, falls back to embedded
   products if no productIds are set (backwards compat)
===================================================== */
async function enrichSections(sections = []) {
  return Promise.all(
    sections.map(async (sec) => {
      // ── NEW FLOW: productIds pinned via admin editor ──
      if (sec.productIds?.length) {
        const docs = await Product.find({
          _id:    { $in: sec.productIds },
          isActive: true,
        })
          .select("name images variants category brand rating reviewCount")
          .lean();

        // Preserve admin-defined order
        const map     = Object.fromEntries(docs.map((p) => [String(p._id), p]));
        const ordered = sec.productIds
          .map((id) => map[String(id)])
          .filter(Boolean);

        return {
          title:    sec.title    || "",
          subtitle: sec.subtitle || "",
          badge:    sec.badge    || "",
          products: ordered,
        };
      }

      // ── LEGACY FLOW: embedded static products ──
      return {
        title:    sec.title    || "",
        subtitle: sec.subtitle || "",
        badge:    sec.badge    || "",
        products: sec.products || [],
      };
    })
  );
}

/* ╔═════════════════════════════════════════════════════╗
   ║              HOME SECTION ROUTES                   ║
   ╚═════════════════════════════════════════════════════╝ */

/* ─── PUBLIC — GET /api/home-layout ─────────────────── */
router.get("/home-layout", async (req, res) => {
  try {
    await ensureSystemSections(); // ✅ Ensure AI sections exist in DB
    const sections = await HomeSection.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    for (const section of sections) {
      if (section.type === "CATEGORY" && section.data?.categorySlug) {
        section.data.products = await Product.find({
          categorySlug: section.data.categorySlug,
          isActive: true,
        })
          .limit(6)
          .select("name price mrp images");
      }
    }

    return res.json({
      success:  true,
      sections: sections.map((s) => ({
        id:    s._id,
        _id:   s._id,
        type:  s.type,
        order: s.order, // ✅ Added for verification
        data:  s.data || {},
      })),
    });
  } catch (err) {
    console.error("Home layout error:", err);
    return res.status(500).json({ success: false, message: "Failed to load home layout" });
  }
});

/* ─── SHARED HELPER: Ensure System Sections Exist ───── */
async function ensureSystemSections() {
  const systemSections = [
    { type: "TRENDING_TICKER", order: 1.5 },
    { type: "FLASH_SALE", order: 1.6 },
    { type: "STILL_LOOKING", order: 20 },
    { type: "ALSO_BOUGHT", order: 21 },
    { type: "SUGGESTED_PRODUCTS", order: 22 },
  ];

  for (const sys of systemSections) {
    const exists = await HomeSection.findOne({ type: sys.type });
    if (!exists) {
      await HomeSection.create({ ...sys, isActive: true, data: {} });
    }
  }
}

/* ─── ADMIN — GET all sections ──────────────────────── */
router.get("/admin/home-layout", adminAuth, async (req, res) => {
  try {
    await ensureSystemSections();
    const sections = await HomeSection.find().sort({ order: 1 }).lean();
    return res.json({
      success:  true,
      sections: sections.map((s) => ({
        _id:      s._id,
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

/* ─── ADMIN — CREATE section ────────────────────────── */
router.post("/admin/home-section", adminAuth, async (req, res) => {
  try {
    const { type, order, data } = req.body;
    const section = await HomeSection.create({ type, order, data: data || {} });
    return res.json({ success: true, section });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Create failed" });
  }
});

/* ─── ADMIN — UPDATE section ────────────────────────── */
router.put("/admin/home-section/:id", adminAuth, async (req, res) => {
  try {
    const { type, order, data } = req.body;
    const section = await HomeSection.findByIdAndUpdate(
      req.params.id,
      { type, order, data },
      { new: true }
    );
    if (!section) return res.status(404).json({ success: false, message: "Section not found" });
    return res.json({ success: true, section });
  } catch (err) {
    console.error("Update section error:", err);
    return res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* ─── ADMIN — TOGGLE section ────────────────────────── */
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

/* ─── ADMIN — REORDER sections ──────────────────────── */
router.put("/admin/home-section/reorder", adminAuth, async (req, res) => {
  try {
    const { order, sections } = req.body;
    const items = sections || order;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Invalid payload: sections or order array required" });
    }

    console.log(`🔄 [HomeSection] Reordering ${items.length} sections...`);
    
    for (const item of items) {
      const id = item._id || item.id;
      const orderVal = parseInt(item.order);
      
      if (!id || isNaN(orderVal)) {
        console.warn("⚠️ Skipping invalid reorder item:", item);
        continue;
      }

      console.log(`   - Updating section ${id} to order ${orderVal}`);
      await HomeSection.findByIdAndUpdate(id, { $set: { order: orderVal } });
    }

    console.log("✅ [HomeSection] Reorder complete");
    return res.json({ success: true, message: "Order updated successfully" });
  } catch (err) {
    console.error("🔥 REORDER CRASH:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error during reorder", 
      error: err.message 
    });
  }
});


/* ╔═════════════════════════════════════════════════════╗
   ║         OFFER PAGE ROUTES  (/offer-page)           ║
   ║  Uses your existing OfferPage model                ║
   ╚═════════════════════════════════════════════════════╝ */

/* ─────────────────────────────────────────────────────
   PUBLIC — GET /api/home-layout/offer-page/:slug
   Called by the mobile OffersScreen
───────────────────────────────────────────────────── */
router.get("/offer-page/:slug", async (req, res) => {
  try {
    const page = await OfferPage.findOne({
      slug:     req.params.slug.toLowerCase().trim(),
      isActive: true,
    }).lean();

    if (!page) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    // Enrich: resolve productIds → full products (or pass embedded ones)
    const sections = await enrichSections(page.sections);

    return res.json({
      success:        true,
      slug:           page.slug,
      banner:         page.banner,
      title:          page.title,
      subtitle:       page.subtitle       || "",
      countdownHours: page.countdownHours || 6,
      sections,
    });
  } catch (err) {
    console.error("OfferPage GET error:", err);
    return res.status(500).json({ success: false, message: "Failed to load offer page" });
  }
});

/* ─────────────────────────────────────────────────────
   ADMIN — GET /api/home-layout/admin/offer-page/all
   List all offer pages (for editor sidebar / switcher)
───────────────────────────────────────────────────── */
router.get("/admin/offer-page/all", adminAuth, async (req, res) => {
  try {
    const pages = await OfferPage.find()
      .sort({ createdAt: -1 })
      .select("slug title banner isActive countdownHours createdAt")
      .lean();
    return res.json({ success: true, pages });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch pages" });
  }
});

/* ─────────────────────────────────────────────────────
   ADMIN — GET /api/home-layout/admin/offer-page/:slug
   Load one page for the editor
   Returns raw productIds (not enriched) so the editor
   can display the picker with selections ticked
───────────────────────────────────────────────────── */
router.get("/admin/offer-page/:slug", adminAuth, async (req, res) => {
  try {
    const page = await OfferPage.findOne({
      slug: req.params.slug.toLowerCase().trim(),
    }).lean();

    if (!page) {
      // Page doesn't exist yet → return empty scaffold
      // Editor will create it on first PUT (upsert)
      return res.json({
        success: true,
        page: {
          slug:           req.params.slug.toLowerCase().trim(),
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

/* ─────────────────────────────────────────────────────
   ADMIN — PUT /api/home-layout/admin/offer-page/:slug
   Create or update (upsert) an offer page
   Accepts sections with productIds (new) or embedded
   products array (legacy)
───────────────────────────────────────────────────── */
router.put("/admin/offer-page/:slug", adminAuth, async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const {
      banner,
      title,
      subtitle,
      countdownHours,
      isActive,
      sections,
    } = req.body;

    // Sanitise sections — support both productIds (new) and embedded products (legacy)
    const cleanSections = (sections || []).map((sec) => ({
      title:      sec.title      || "",
      subtitle:   sec.subtitle   || "",
      badge:      sec.badge      || "",
      // New flow: admin pins real product IDs
      productIds: (sec.productIds || []).filter(Boolean),
      // Legacy flow: embedded static product objects
      products:   (sec.products  || []),
    }));

    const page = await OfferPage.findOneAndUpdate(
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
    console.error("OfferPage PUT error:", err);
    return res.status(500).json({ success: false, message: "Save failed", error: err.message });
  }
});

/* ─────────────────────────────────────────────────────
   ADMIN — PATCH /api/home-layout/admin/offer-page/:slug/toggle
───────────────────────────────────────────────────── */
router.patch("/admin/offer-page/:slug/toggle", adminAuth, async (req, res) => {
  try {
    const page = await OfferPage.findOne({
      slug: req.params.slug.toLowerCase().trim(),
    });
    if (!page) return res.status(404).json({ success: false, message: "Not found" });
    page.isActive = !page.isActive;
    await page.save();
    return res.json({ success: true, isActive: page.isActive });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Toggle failed" });
  }
});

/* ─────────────────────────────────────────────────────
   ADMIN — DELETE /api/home-layout/admin/offer-page/:slug
───────────────────────────────────────────────────── */
router.delete("/admin/offer-page/:slug", adminAuth, async (req, res) => {
  try {
    await OfferPage.findOneAndDelete({
      slug: req.params.slug.toLowerCase().trim(),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
});

module.exports = router;