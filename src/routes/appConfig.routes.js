// src/routes/appConfig.routes.js
const express = require("express");
const router = express.Router();

const APP_CONFIG = {
  min_version_android: "1.1.0",
  min_version_ios: "1.0.0",

  force_update_message:
    "A new version of FreshLaa is available with important improvements.",

  maintenance_mode: false,
  maintenance_message:
    "FreshLaa is currently under maintenance. Please try again later.",

  /* ─────────────────────────────────────────────────────
     SPLASH SCREEN — change these values anytime
     type: "lottie" | "image" | "none"

     For LOTTIE:
       set type = "lottie"
       set lottie_url to any LottieFiles CDN URL
       leave image_url as ""

     For IMAGE:
       set type = "image"
       set image_url to any Cloudinary/CDN URL
       leave lottie_url as ""

     duration_ms = how long splash shows before going to Home
  ───────────────────────────────────────────────────── */
  splash: {
    type: "image",                      // "lottie" | "image" | "none"
    lottie_url: "https://assets10.lottiefiles.com/packages/lf20_xlmz9xwm.json",
    image_url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1773170384/66a99aa1-8287-4b4d-8093-37686f06c738_a7p89s.jpg",
    bg_color: "#ffffff",
    tagline: "Fresh delivery in 10 mins ⚡",
    tagline_color: "#16a34a",
    duration_ms: 3000,
  },
};

router.get("/app-config", (req, res) => {
  res.json({
    success: true,
    ...APP_CONFIG,
  });
});

module.exports = router;