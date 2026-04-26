const express = require("express");
const router = express.Router();
const {
    getHomeLayout,
    getAllSections,
    toggleSection,
    updateOrder,
    updateSection,
} = require("../controllers/homeLayout.controller");

// Safe auth middleware load — won't crash if naming differs
let protect = (req, res, next) => next();
let adminOnly = (req, res, next) => next();
try {
    const auth = require("../middleware/auth");
    if (auth.protect) protect = auth.protect;
    if (auth.adminOnly) adminOnly = auth.adminOnly;
    if (auth.isAdmin) adminOnly = auth.isAdmin;   // fallback name
} catch (e) {
    console.warn("⚠️  homeLayout.routes: auth middleware not found");
}

// ── Public ──────────────────────────────────────────────────
router.get("/", getHomeLayout);                                       // GET /api/home-layout

// ── Admin ────────────────────────────────────────────────────
router.get("/admin/all", protect, adminOnly, getAllSections);
router.patch("/admin/:id/toggle", protect, adminOnly, toggleSection);
router.put("/admin/:id", protect, adminOnly, updateSection);
router.post("/admin/reorder", protect, adminOnly, updateOrder);

module.exports = router;