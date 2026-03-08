// src/routes/appConfig.routes.js
const express = require("express");
const router = express.Router();

const APP_CONFIG = {
  min_version_android: "1.2.0",
  min_version_ios: "1.0.0",

  force_update_message:
    "A new version of FreshLaa is available with important improvements.",

  maintenance_mode: false,
  maintenance_message:
    "FreshLaa is currently under maintenance. Please try again later."
};

router.get("/app-config", (req, res) => {
  res.json({
    success: true,
    ...APP_CONFIG
  });
});

module.exports = router;