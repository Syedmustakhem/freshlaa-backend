const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/category.controller");

// DEBUG (temporary)
console.log("CATEGORY CONTROLLER:", Object.keys(categoryController));

router.get("/", categoryController.getZeptoCategories);
router.get("/section/:sectionId", categoryController.getCategoriesBySection);
// router.get("/landing/:slug", categoryController.getCategoryLanding);

module.exports = router;
