// src/routes/appConfig.routes.js

const express = require("express");
const router = express.Router();

/* ───────────────── STORE CONFIG ───────────────── */

const STORE_LOCATION = {
  lat: Number(process.env.STORE_LAT),
  lng: Number(process.env.STORE_LNG),
};

const KADIRI_PINCODE = "515591";

const NIGHT_START = 22; // 10 PM
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

const AppConfig = require("../models/AppConfig");
const ServiceableArea = require("../models/ServiceableArea");

router.get("/delivery-config", async (req, res) => {
  try {
    let { pincode, lat, lng } = req.query;

    if (!pincode) {
      return res.status(400).json({ success: false, message: "Pincode required" });
    }

    pincode = pincode.trim();

    // 🔍 FETCH CONFIG FROM DB
    const [config, area] = await Promise.all([
      AppConfig.findOne().lean(),
      ServiceableArea.findOne({ pincode }).lean()
    ]);

    if (!area || !area.isActive) {
      return res.json({
        success: false,
        message: "Sorry, we don't deliver to this area yet.",
        instantAvailable: false
      });
    }

    /* 🕒 NIGHT CHECK (Dynamic) */
    const hour = Number(
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hour12: false,
      })
    );

    const cutoffHour = config?.deliveryTiming?.cutoffHour || NIGHT_START;
    const isNight = hour >= cutoffHour || hour < NIGHT_END;

    if (isNight) {
      return res.json({
        success: true,
        instantAvailable: false,
        estimatedTime: null,
        showTomorrowSlots: true,
        nightMessage: "⏰ Instant delivery is closed for today. Please choose a slot for tomorrow.",
      });
    }

    let estimatedTime = "30-40 mins"; // Default fallback
    let instantAvailable = area.isInstantAvailable;

    // 1️⃣ CHECK FOR AREA-SPECIFIC OVERRIDE
    if (area.estimatedTime) {
      estimatedTime = area.estimatedTime;
    } 
    // 2️⃣ CHECK FOR DISTANCE-BASED RULES IF LAT/LNG PROVIDED
    else if (lat && lng && config && config.deliveryTiming?.distanceRules?.length > 0) {
      const distance = calculateDistance(
        STORE_LOCATION.lat,
        STORE_LOCATION.lng,
        Number(lat),
        Number(lng)
      );
      
      // Sort rules by maxKm to find the first matching range
      const sortedRules = [...config.deliveryTiming.distanceRules].sort((a, b) => a.maxKm - b.maxKm);
      const matchingRule = sortedRules.find(rule => distance <= rule.maxKm);
      
      if (matchingRule) {
        estimatedTime = matchingRule.eta;
      } else {
        estimatedTime = config.deliveryTiming.baseEtaRange || "45 mins";
      }
    } 
    // 3️⃣ FALLBACK TO GLOBAL BASE ETA
    else if (config && config.deliveryTiming?.baseEtaRange) {
      estimatedTime = config.deliveryTiming.baseEtaRange;
    }

    // 4️⃣ APPLY GLOBAL DELAY (SURGE)
    if (config && config.deliveryTiming?.globalDelayMins > 0) {
      // Simple string manipulation to add " (+10m surge)" or similar if it's a string
      // Or just keep it as is if it's already a descriptive string.
      // Better idea: append " (Delayed due to traffic/rain)" if delay is significant
      if (config.deliveryTiming.globalDelayMins >= 15) {
        estimatedTime += " (High Demand)";
      }
    }

    return res.json({
      success: true,
      instantAvailable,
      estimatedTime,
      distance: (lat && lng) ? calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, Number(lat), Number(lng)).toFixed(2) + " km" : null,
      showTomorrowSlots: false,
    });
  } catch (err) {
    console.error("Delivery Config Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

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