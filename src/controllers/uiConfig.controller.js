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

    // ✅ Convert to plain JSON
    let plain = JSON.parse(JSON.stringify(config));

    // 🚀 TEST MODE (SUPER IMPORTANT)
    const testType = req.query.test; 
    // example: ?test=stars

    if (testType) {
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
        },

        flash: {
          gradient: ["#FF0000", "#FF6A00"],
          animation: { type: "wave", speed: 1500, intensity: 150 }
        }
      };

      if (testConfigs[testType]) {
        plain.header = testConfigs[testType];
      }
    }

    // 🌙 NIGHT MODE AUTO
    const hour = now.getHours();

    if (!testType && hour >= 18) {
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

    console.log("FINAL RESPONSE:", plain.header);

    res.json(plain);

  } catch (err) {
    console.error("UI CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};