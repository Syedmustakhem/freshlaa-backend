const express = require("express");
const router = express.Router();
const { getBrand, upsertBrand, updateTabIcon } = require("../controllers/brand.controller");
const adminAuth = require("../middlewares/adminAuth"); // ✅

/* Public — App calls this */
router.get("/", getBrand);

/* Admin protected */
router.post("/", adminAuth, upsertBrand);
router.patch("/tab-icon", adminAuth, updateTabIcon);

module.exports = router;