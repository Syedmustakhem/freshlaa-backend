const UIConfig = require("../models/uiConfig.model");

exports.getUIConfig = async (req, res) => {
  try {
    let config = await UIConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });

    if (!config) return res.json({});

    const now = new Date();

    if (config.schedule?.startTime && config.schedule?.endTime) {
      if (now < config.schedule.startTime || now > config.schedule.endTime) {
        return res.json({});
      }
    }

    let plain = JSON.parse(JSON.stringify(config));

    // 🔥 GLOBAL TEST CONFIGS
    const testConfigs = {
      wave: {
        gradient: ["#FF3D00", "#FF9100"],
        animation: { type: "wave", speed: 3000, intensity: 100 }
      },

      glow: {
        gradient: ["#667eea", "#764ba2"],
        animation: { type: "glow", speed: 2000 }
      },

      stars: {
        gradient: ["#0f2027", "#203a43", "#2c5364"],
        animation: { type: "stars", density: 8 }
      },

      sunrise: {
        gradient: ["#FFDEE9", "#B5FFFC"],
        animation: { type: "sunrise", speed: 4000 }
      }
    };

    const testType = req.query.test;

    // ✅ 1. URL TEST (highest priority)
    if (testType && testConfigs[testType]) {
      plain.header = testConfigs[testType];
    }

    // ✅ 2. DB TEST MODE
    else if (plain.testMode && testConfigs[plain.testMode]) {
      plain.header = testConfigs[plain.testMode];
    }

    // ✅ 3. NIGHT MODE
    else {
      const hour = now.getHours();

      if (hour >= 18) {
        plain.header = {
          gradient: ["#0f2027", "#203a43", "#2c5364"],
          animation: {
            type: "stars",
            density: 6,
            speed: 4000,
            color: "#ffffff"
          }
        };
      }
    }

    console.log("FINAL RESPONSE:", plain.header);

    res.json(plain);

  } catch (err) {
    console.error("UI CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};