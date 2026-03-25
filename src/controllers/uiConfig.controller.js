const UIConfig = require("../models/uiConfig.model");

exports.getUIConfig = async (req, res) => {
  try {
    let config = await UIConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });

    if (!config) {
      return res.json({});
    }

    const now = new Date();

    // ✅ Time-based activation
    if (config.schedule?.startTime && config.schedule?.endTime) {
      if (now < config.schedule.startTime || now > config.schedule.endTime) {
        return res.json({});
      }
    }

    // ✅ Night Mode Auto Override
    const hour = now.getHours();
    let finalConfig = config.toObject(); // 🔥 IMPORTANT

    if (hour >= 18) {
      finalConfig.header.gradient = ["#1A1A1A", "#000000"];
    }

    res.json(finalConfig);

  } catch (err) {
    console.error("UI CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};