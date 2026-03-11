// src/routes/appConfig.routes.js

const express = require("express");
const router = express.Router();

/* ───────────────── DELIVERY CONFIG ───────────────── */

const KADIRI_PINCODE = "515591";

const NIGHT_START = 21; // 9 PM
const NIGHT_END = 8;    // 8 AM

router.get("/delivery-config", (req, res) => {
  try {

    let { pincode } = req.query;

    /* 🚨 Validate pincode */
    if (!pincode || pincode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Pincode is required",
      });
    }

    pincode = pincode.trim();

    /* ✅ Get IST hour safely */
    const istHour = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    });

    const hour = Number(istHour);

    const isNight = hour >= NIGHT_START || hour < NIGHT_END;

    const isKadiri = pincode === KADIRI_PINCODE;

    /* 🌙 Night Delivery Disabled */
    if (isNight) {
      return res.json({
        success: true,
        instantAvailable: false,
        estimatedTime: null,
        nightMessage:
          "⏰ Instant delivery is not available right now. Please select a scheduled slot.",
      });
    }

    /* ⚡ Instant Delivery Available */
    return res.json({
      success: true,
      instantAvailable: true,
      estimatedTime: isKadiri ? "20-25 mins" : "40 mins",
      nightMessage: null,
    });

  } catch (err) {

    console.error("Delivery Config Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* ───────────────── APP CONFIG ───────────────── */

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

    lottie_url:
      "https://assets10.lottiefiles.com/packages/lf20_xlmz9xwm.json",

    image_url:
      "https://res.cloudinary.com/dxiujfq7i/image/upload/v1773170384/66a99aa1-8287-4b4d-8093-37686f06c738_a7p89s.jpg",

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