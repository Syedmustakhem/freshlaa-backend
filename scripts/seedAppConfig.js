require("dotenv").config();
const mongoose = require("mongoose");
const AppConfig = require("../src/models/AppConfig");

const MONGO_URI = process.env.MONGO_URI;

const APP_CONFIG_INITIAL = {
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
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    let config = await AppConfig.findOne();
    if (!config) {
      config = new AppConfig(APP_CONFIG_INITIAL);
      await config.save();
      console.log("Created initial AppConfig document");
    } else {
      // Merge initial fields if they don't exist
      Object.keys(APP_CONFIG_INITIAL).forEach(key => {
        if (config[key] === undefined || (key === 'splash' && !config.splash.image_url)) {
          config[key] = APP_CONFIG_INITIAL[key];
        }
      });
      await config.save();
      console.log("Updated existing AppConfig document with new fields");
    }

    console.log("AppConfig seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
