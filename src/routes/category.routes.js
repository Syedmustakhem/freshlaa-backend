const express = require("express");
const router = express.Router();

const {
  getMainCategories,
  getSubCategories,
} = require("../controllers/category.controller");

// 🔥 HOME + ZEPTO GRID
router.get("/categories", getMainCategories);

// 🔥 CATEGORY LANDING (INSIDE)
router.get("/categories/:slug", getSubCategories);

module.exports = router;
