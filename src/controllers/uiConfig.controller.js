const UIConfig = require("../models/uiConfig.model");


function getISTHour() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST = UTC + 5h 30m
  const istDate = new Date(Date.now() + IST_OFFSET_MS);
  return istDate.getUTCHours(); // getUTCHours on the shifted time = IST hour
}

let _dbCache     = null;
let _dbCacheTime = 0;
const CACHE_TTL  = 5 * 60 * 1000; // 5 min — only avoids DB hammering

function buildTheme(config, hour) {

  if (config.overrideNight) {
    return config.header;
  }  if (hour >= 19 || hour < 7) {
    return {
      gradient: ["#0f2027", "#203a43", "#2c5364"],
      animation: {
        type:           "stars",
        density:        20,
        speed:          7000,
        color:          "rgba(255,255,255,0.85)",
        secondaryColor: null,
        intensity:      300,
      },
    };
  }
  if (hour >= 16 && hour < 19) {
    return {
      gradient: ["#ee0979", "#ff6a00"],
      animation: {
        type:           "glow",
        speed:          4000,
        color:          "rgba(255,255,255,0.1)",
        secondaryColor: null,
        intensity:      300,
        density:        12,
      },
    };
  }

  return config.header;
}

// ─── Main handler
exports.getUIConfig = async (req, res) => {
  try {
    const now  = Date.now();
    const hour = getISTHour(); // ← always IST, not server local time

    // Cache raw DB doc only (NOT the themed result)
    // buildTheme() runs fresh every request with current IST hour
    if (!_dbCache || now - _dbCacheTime > CACHE_TTL) {
      const config = await UIConfig.findOne({ isActive: true }).lean();
      _dbCache     = config;
      _dbCacheTime = now;
    }

    if (!_dbCache) return res.json({});

    // Schedule check
    if (_dbCache.schedule?.startTime && _dbCache.schedule?.endTime) {
      const nowDate = new Date();
      const start   = new Date(_dbCache.schedule.startTime);
      const end     = new Date(_dbCache.schedule.endTime);
      if (nowDate < start || nowDate > end) return res.json({});
    }

    const result = {
      title:         _dbCache.title         || "Freshlaa",
      header:        buildTheme(_dbCache, hour),
      featureFlags:  _dbCache.featureFlags  || {},
      overrideNight: _dbCache.overrideNight || false,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(`[UIConfig] IST hour=${hour} → theme=${result.header?.animation?.type} | gradient=${result.header?.gradient?.[0]}`);
    }

    return res.json(result);

  } catch (err) {
    console.error("[UIConfig] ERROR:", err.message);
    return res.status(500).json({ error: "Failed to load UI config" });
  }
};

// ─── Clear cache after updating Compass
exports.clearCache = (_req, res) => {
  _dbCache     = null;
  _dbCacheTime = 0;
  console.log("[UIConfig] Cache cleared");
  return res.json({ message: "Cache cleared" });
};