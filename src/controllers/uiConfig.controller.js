const UIConfig = require("../models/uiConfig.model");

exports.getUIConfig = async (req, res) => {
  try {
    // ✅ Get ONLY active config
    let config = await UIConfig.findOne({ isActive: true });

    if (!config) return res.json({});

    const now = new Date();

    // ✅ Schedule check
    if (config.schedule?.startTime && config.schedule?.endTime) {
      if (now < config.schedule.startTime || now > config.schedule.endTime) {
        return res.json({});
      }
    }

    let plain = JSON.parse(JSON.stringify(config));

    // ✅ NIGHT MODE (auto override)
    const hour = now.getHours();

if (hour >= 18 && !plain.overrideNight) {
  plain.header = {
    gradient: ["#0f2027", "#203a43", "#2c5364"],
    animation: {
      type: "stars",
      density: 8,
      speed: 4000,
      color: "#ffffff"
    }
  };
}

    console.log("FINAL RESPONSE:", plain.header);

    res.json(plain);

  } catch (err) {
    console.error("UI CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};