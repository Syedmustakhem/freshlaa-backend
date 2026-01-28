const express = require("express");
const router = express.Router();

const {
  getMainCategories,
  getSubCategories,
} = require("../controllers/category.controller");

// 🔥 Home + Zepto grid
router.get("/categories", getMainCategories);

// 🔥 Category landing
router.get("/categories/:slug", getSubCategories);

module.exports = router;
