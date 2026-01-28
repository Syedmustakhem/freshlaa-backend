const express = require("express");
const router = express.Router();

const {
  getZeptoCategories
} = require("../controllers/category.controller");

// 👇 ROOT PATH
router.get("/", getZeptoCategories);

module.exports = router;
