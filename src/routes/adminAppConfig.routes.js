const express = require("express");
const router = express.Router();
const adminAuth = require("../middlewares/adminAuth");
const { getAppConfig, updateAppConfig } = require("../controllers/admin/appConfig.controller");

router.get("/", adminAuth, getAppConfig);
router.put("/", adminAuth, updateAppConfig);

module.exports = router;
