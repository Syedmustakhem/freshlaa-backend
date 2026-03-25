const UIConfig = require("../models/uiConfig.model");

exports.getUIConfig = async (req, res) => {
  try {
    let config = await UIConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });

    if (!config) return res.json({});

    const now = new Date();

    // Schedule check
    if (config.schedule?.startTime && config.schedule?.endTime) {
      if (now < config.schedule.startTime || now > config.schedule.endTime) {
        return res.json({});
      }
    }

    // Convert to pure JSON (🔥 IMPORTANT FIX)
    const plain = JSON.parse(JSON.stringify(config));

    // Night mode override
    const hour = now.getHours();
    if (hour >= 18) {
      plain.header.gradient = ["#1A1A1A", "#000000"];
    }

    console.log("FINAL RESPONSE:", plain.header);

    res.json(plain);

  } catch (err) {
    console.error("UI CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};