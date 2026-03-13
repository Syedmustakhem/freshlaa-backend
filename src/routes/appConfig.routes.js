// src/routes/appConfig.routes.js

const express = require("express");
const router = express.Router();

/* ───────────────── STORE CONFIG ───────────────── */

const STORE_LOCATION = {
  lat: Number(process.env.STORE_LAT),
  lng: Number(process.env.STORE_LNG)
};

const KADIRI_PINCODE = "515591";

const NIGHT_START = 21; // 9 PM
const NIGHT_END = 8; // 8 AM


/* ───────────────── DISTANCE FUNCTION ───────────────── */

function calculateDistance(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}


/* ───────────────── DELIVERY CONFIG API ───────────────── */

router.get("/delivery-config", (req, res) => {

  try {

    let { pincode, lat, lng } = req.query;

    if (!pincode) {
      return res.status(400).json({
        success:false,
        message:"Pincode required"
      });
    }

    pincode = pincode.trim();

    /* 🕒 NIGHT CHECK */

    const hour = Number(
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hour12:false
      })
    );

    const isNight = hour >= NIGHT_START || hour < NIGHT_END;

    if (isNight) {

      return res.json({
        success:true,
        instantAvailable:false,
        estimatedTime:null,
        showTomorrowSlots:true,
        nightMessage:
        "⏰ Instant delivery is closed for today. Please choose a slot for tomorrow."
      });

    }

    /* OTHER PINCODES */

    if (pincode !== KADIRI_PINCODE) {

      return res.json({
        success:true,
        instantAvailable:true,
        estimatedTime:"45 mins",
        distance:null
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

      if (distance <= 0.5) {
        estimatedTime = "25 mins";
      }
      else if (distance <= 1) {
        estimatedTime = "30 mins";
      }
      else {
        estimatedTime = "30-35 mins";
      }

    }

    return res.json({

      success:true,
      instantAvailable:true,
      estimatedTime,
      distance: distance ? distance.toFixed(2) + " km" : null,
      showTomorrowSlots:false

    });

  } catch (err) {

    console.error("Delivery Config Error:", err);

    return res.status(500).json({
      success:false,
      message:"Internal server error"
    });

  }

});



/* ───────────────── APP CONFIG ───────────────── */

const APP_CONFIG = {

  min_version_android: "1.2.0",
   latest_version_android: "1.2.0",
  min_version_ios: "1.0.0",

  force_update_message:
  "A new version of FreshLaa is available with important improvements.",

  maintenance_mode:false,

  maintenance_message:
  "FreshLaa is currently under maintenance. Please try again later.",

  splash:{
    type:"image",

    lottie_url:
    "https://assets10.lottiefiles.com/packages/lf20_xlmz9xwm.json",

    image_url:
    "https://res.cloudinary.com/dxiujfq7i/image/upload/v1773170384/66a99aa1-8287-4b4d-8093-37686f06c738_a7p89s.jpg",

    bg_color:"#ffffff",

    tagline:"Fresh delivery in 10 mins ⚡",

    tagline_color:"#16a34a",

    duration_ms:3000
  }

};


router.get("/app-config",(req,res)=>{

  res.set("Cache-Control","no-store");

  res.json({
    success:true,
    ...APP_CONFIG
  });

});


module.exports = router;