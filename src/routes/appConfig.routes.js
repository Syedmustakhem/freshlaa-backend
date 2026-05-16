// src/routes/appConfig.routes.js

const express = require("express");
const router = express.Router();

/* ───────────────── STORE CONFIG ───────────────── */

const STORE_LOCATION = {
  lat: Number(process.env.STORE_LAT),
  lng: Number(process.env.STORE_LNG),
};

const KADIRI_PINCODE = "515591";

const NIGHT_START = 21; // 9 PM
const NIGHT_END = 8;   // 8 AM

/* ───────────────── DISTANCE FUNCTION ───────────────── */

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ───────────────── DELIVERY CONFIG API ───────────────── */

router.get("/delivery-config", (req, res) => {
  try {
    let { pincode, lat, lng } = req.query;

    if (!pincode) {
      return res.status(400).json({ success: false, message: "Pincode required" });
    }

    pincode = pincode.trim();

    /* 🕒 NIGHT CHECK */
    const hour = Number(
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hour12: false,
      })
    );

    const isNight = hour >= NIGHT_START || hour < NIGHT_END;

    if (isNight) {
      return res.json({
        success: true,
        instantAvailable: false,
        estimatedTime: null,
        showTomorrowSlots: true,
        nightMessage:
          "⏰ Instant delivery is closed for today. Please choose a slot for tomorrow.",
      });
    }

    /* OTHER PINCODES */
    if (pincode !== KADIRI_PINCODE) {
      return res.json({
        success: true,
        instantAvailable: true,
        estimatedTime: "45 mins",
        distance: null,
      });
    }

    /* KADIRI DISTANCE ETA */
    let distance = null;

    if (lat && lng) {
      distance = calculateDistance(
        STORE_LOCATION.lat,
        STORE_LOCATION.lng,
        Number(lat),
        Number(lng)
      );
    }

    let estimatedTime = "30 mins";

    if (distance !== null) {
      if (distance <= 0.5) estimatedTime = "25 mins";
      else if (distance <= 1) estimatedTime = "30 mins";
      else estimatedTime = "30-35 mins";
    }

    return res.json({
      success: true,
      instantAvailable: true,
      estimatedTime,
      distance: distance ? distance.toFixed(2) + " km" : null,
      showTomorrowSlots: false,
    });
  } catch (err) {
    console.error("Delivery Config Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const AppConfig = require("../models/AppConfig");

router.get("/app-config", async (req, res) => {
  // ✅ no-store prevents CDN/proxy caching — version check always hits live server
  res.set("Cache-Control", "no-store");
  
  try {
    const config = await AppConfig.findOne().lean();
    
    if (config) {
      return res.json({ 
        success: true, 
        ...config,
        // Ensure splash structure matches what the app expects if it was stored differently
        splash: config.splash || {
          type: "image",
          image_url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1778950843/Freshlaa_grocery_app_splash_screen_202605162230_kdzbum.jpg",
          duration_ms: 1500
        }
      });
    }

    // Fallback to hardcoded values if DB is empty
    return res.json({ 
      success: true, 
      min_version_android: "1.8.0",
      latest_version_android: "1.8.0",
      min_version_ios: "1.0.0",
      force_update_message: "A new version of FreshLaa is available with important improvements.",
      maintenance_mode: false,
      maintenance_message: "FreshLaa is currently under maintenance. Please try again later.",
      splash: {
        type: "image",
        lottie_url: "https://assets10.lottiefiles.com/packages/lf20_xlmz9xwm.json",
        image_url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1778394012/Freshlaa_Mother_s_Day_splash_screen_202605101149_qzvd43.jpg",
        duration_ms: 1500,
      },
    });
  } catch (err) {
    console.error("APP CONFIG FETCH ERROR:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;