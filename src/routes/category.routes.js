const express = require("express");
const router = express.Router();

const {
  getZeptoCategories,
  getCategoriesBySection, // or getSubCategories if you keep slug logic
} = require("../controllers/category.controller");

/* 🔥 ZEPTO HOME GRID */
router.get("/", getZeptoCategories);

/* 🔥 CATEGORY LANDING (INSIDE CATEGORY) */
// option A: section based (recommended)
router.get("/section/:sectionId", getCategoriesBySection);

// option B: slug based (only if you really use parentSlug)
// router.get("/:slug", getSubCategories);

module.exports = router;
