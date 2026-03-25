const UIConfig = require("../models/uiConfig.model");

exports.getUIConfig = async (req, res) => {
  try {
    let config = await UIConfig.findOne({ isActive: true });

    if (!config) return res.json({});

    const now = new Date();
    const hour = now.getHours();

    // ✅ Schedule check (optional)
    if (config.schedule?.startTime && config.schedule?.endTime) {
      if (now < config.schedule.startTime || now > config.schedule.endTime) {
        return res.json({});
      }
    }

    let plain = JSON.parse(JSON.stringify(config));

    // 🚀 TIME-BASED THEMES

    // 🌙 NIGHT (7 PM → 7 AM)
    if (hour >= 19 || hour < 7) {
      plain.header = {
        gradient: ["#0f2027", "#203a43", "#2c5364"],
        animation: {
          type: "stars",
          density: 5,
          speed: 6000,
          color: "rgba(255,255,255,0.8)"
        }
      };
    }

    // 🌇 EVENING (4 PM → 7 PM)
    else if (hour >= 16 && hour < 19) {
      plain.header = {
        gradient: ["#ee0979", "#ff6a00"],
        animation: {
          type: "glow",
          speed: 4000,
          color: "rgba(255,255,255,0.1)"
        }
      };
    }

    // 🌅 DAY (7 AM → 4 PM)
    else {
      // 👉 Use DB config (your manual control)
      plain.header = config.header;
    }

    console.log("TIME:", hour);
    console.log("FINAL THEME:", plain.header);

    res.json(plain);

  } catch (err) {
    console.error("UI CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};