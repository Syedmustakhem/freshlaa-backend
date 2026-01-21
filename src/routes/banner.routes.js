const express = require("express");
const router = express.Router();

const {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/banner.controller");

/* ================= PUBLIC ================= */

// Get active banners (for frontend)
router.get("/", getBanners);

/* ================= ADMIN ================= */

// Add banner
router.post("/", createBanner);

// Update banner
router.put("/:id", updateBanner);

// Delete banner
router.delete("/:id", deleteBanner);

module.exports = router;
