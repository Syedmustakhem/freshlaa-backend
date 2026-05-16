const AppConfig = require("../../models/AppConfig");

exports.getAppConfig = async (req, res) => {
  try {
    let config = await AppConfig.findOne().lean();
    if (!config) {
      // Return defaults if not found
      return res.json({
        success: true,
        data: {
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
        }
      });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    console.error("GET APP CONFIG ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch app config" });
  }
};

exports.updateAppConfig = async (req, res) => {
  try {
    const updates = req.body;
    let config = await AppConfig.findOne();
    
    if (!config) {
      config = new AppConfig(updates);
    } else {
      Object.assign(config, updates);
    }
    
    await config.save();
    res.json({ success: true, message: "App config updated successfully", data: config });
  } catch (err) {
    console.error("UPDATE APP CONFIG ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to update app config" });
  }
};
