const express = require("express");
const router = express.Router();

const { getAdminCategories } = require("../../controllers/admin/category.controller");

// 🔐 add adminAuth middleware later if needed
router.get("/categories", getAdminCategories);

module.exports = router;
