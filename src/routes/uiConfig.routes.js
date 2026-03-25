const express = require("express");
const router = express.Router();
const { getUIConfig } = require("../controllers/uiConfig.controller");

router.get("/ui-config", getUIConfig);

module.exports = router;