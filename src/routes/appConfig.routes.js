// src/routes/appConfig.routes.js
const express = require("express");
const router = express.Router();

// Update these values whenever you release a breaking update
const APP_CONFIG = {
  min_version_android: "1.1.0",  // ← bump this to force update
  min_version_ios: "1.0.0",      // ← bump this for iOS
  message: "A new version of FreshLaa is available with important improvements.",
};

router.get("/app-config", (req, res) => {
  res.json({
    success: true,
    ...APP_CONFIG,
  });
});

module.exports = router;