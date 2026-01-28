const express = require("express");
const router = express.Router();
const { getCategoryBanners } = require("../controllers/categoryBanner.controller");

router.get("/category-banners/:slug", getCategoryBanners);

module.exports = router;
