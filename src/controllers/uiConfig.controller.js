const UIConfig = require("../models/uiConfig.model");

// ─── In-memory cache (avoids DB hit on every app open)
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

// ─── Time-based theme builder (pure function — easy to test)
function buildTheme(config, hour) {
  // 1. overrideNight = true → always use DB config, skip time logic
  if (config.overrideNight) {
    return config.header;
  }

  // 2. 🌙 Night: 7 PM → 7 AM
  if (hour >= 19 || hour < 7) {
    return {
      gradient: ["#0f2027", "#203a43", "#2c5364"],
      animation: {
        type: "stars",
        density: 5,
        speed: 6000,
        color: "rgba(255,255,255,0.8)",
        secondaryColor: null,
        intensity: 300,
      },
    };
  }

  // 3. 🌇 Evening: 4 PM → 7 PM
  if (hour >= 16 && hour < 19) {
    return {
      gradient: ["#ee0979", "#ff6a00"],
      animation: {
        type: "glow",
        speed: 4000,
        color: "rgba(255,255,255,0.1)",
        secondaryColor: null,
        intensity: 300,
        density: 12,
      },
    };
  }

  // 4. ☀️ Daytime: use DB config (your manual control from Compass)
  return config.header;
}

exports.getUIConfig = async (req, res) => {
  try {
    // ─── Serve from cache if fresh
    if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
      return res.json(_cache);
    }

    // ─── Fetch active config (lean = plain JS object, no mongoose overhead)
    const config = await UIConfig.findOne({ isActive: true }).lean();

    // ─── No active config → return empty so frontend uses its defaults
    if (!config) {
      return res.json({});
    }

    // ─── Schedule check (if set, only serve within window)
    if (config.schedule?.startTime && config.schedule?.endTime) {
      const now = new Date();
      const start = new Date(config.schedule.startTime);
      const end = new Date(config.schedule.endTime);
      if (now < start || now > end) {
        return res.json({});
      }
    }

    // ─── Build final response
    const hour = new Date().getHours();
    const result = {
      title: config.title || "Freshlaa",
      header: buildTheme(config, hour),
      featureFlags: config.featureFlags || {},
      overrideNight: config.overrideNight || false,
    };

    // ─── Cache and respond
    _cache = result;
    _cacheTime = Date.now();

    if (process.env.NODE_ENV !== "production") {
      console.log(`[UIConfig] hour=${hour} theme=${result.header?.animation?.type}`);
    }

    return res.json(result);
  } catch (err) {
    console.error("[UIConfig] ERROR:", err.message);
    return res.status(500).json({ error: "Failed to load UI config" });
  }
};

// ─── Call this when you update config in Compass so cache refreshes immediately
exports.clearCache = (_req, res) => {
  _cache = null;
  _cacheTime = 0;
  return res.json({ message: "Cache cleared" });
};