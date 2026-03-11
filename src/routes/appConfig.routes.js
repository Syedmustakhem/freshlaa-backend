// src/routes/appConfig.routes.js
const express = require("express");
const router  = express.Router();

/* ─── Delivery Config ─── */
const KADIRI_PINCODE = "515591";
const NIGHT_START    = 21; // 9 PM
const NIGHT_END      = 8;  // 8 AM

router.get("/delivery-config", (req, res) => {
  try {
    const { pincode } = req.query;

    const now      = new Date();
    const istHour  = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 1 : 0);
    const isNight  = istHour >= NIGHT_START || istHour < NIGHT_END;
    const isKadiri = pincode?.trim() === KADIRI_PINCODE;

    if (isNight) {
      return res.json({
        success:          true,
        instantAvailable: false,
        estimatedTime:    null,
        nightMessage:     "⏰ Instant delivery is not available right now. Please select a scheduled slot.",
      });
    }

    return res.json({
      success:          true,
      instantAvailable: true,
      estimatedTime:    isKadiri ? "20-25 mins" : "40 mins",
      nightMessage:     null,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─── App Config ─── */
const APP_CONFIG = {
  min_version_android: "1.1.0",
  min_version_ios: "1.0.0",

  force_update_message:
    "A new version of FreshLaa is available with important improvements.",

  maintenance_mode: false,
  maintenance_message:
    "FreshLaa is currently under maintenance. Please try again later.",

  splash: {
    type: "image",
    lottie_url: "https://assets10.lottiefiles.com/packages/lf20_xlmz9xwm.json",
    image_url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1773170384/66a99aa1-8287-4b4d-8093-37686f06c738_a7p89s.jpg",
    bg_color: "#ffffff",
    tagline: "Fresh delivery in 10 mins ⚡",
    tagline_color: "#16a34a",
    duration_ms: 3000,
  },
};

router.get("/app-config", (req, res) => {
  res.json({ success: true, ...APP_CONFIG });
});

module.exports = router;