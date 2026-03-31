const UIConfig = require("../models/uiConfig.model");

// ─────────────────────────────────────────────────────────────
// CACHE STRATEGY (the fix):
//
// OLD (buggy): cache stored the FINAL themed result
//   → daytime result cached → served at night → wrong theme
//
// NEW (correct): cache stores only the RAW DB document
//   → buildTheme() runs fresh on EVERY request using current hour
//   → night theme automatically kicks in at 7 PM with no restart
//
// Cache TTL: 5 minutes — only saves DB round-trips,
// does NOT lock in a time-based theme.
// ─────────────────────────────────────────────────────────────

let _dbCache     = null;  // raw DB config (not the themed result)
let _dbCacheTime = 0;
const CACHE_TTL  = 5 * 60 * 1000; // 5 minutes — just avoids DB hammering

// ─── Time-based theme builder (pure, runs on every request)
function buildTheme(config, hour) {

  // overrideNight = true → always use the DB config regardless of time
  // Use this for the "space" theme so it always shows stars
  if (config.overrideNight) {
    return config.header;
  }

  // 🌙 Night: 7 PM (19) → 7 AM (7)
  if (hour >= 19 || hour < 7) {
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

  // 🌇 Evening: 4 PM (16) → 7 PM (19)
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

  // ☀️ Daytime: use whatever is active in DB (your manual Compass control)
  return config.header;
}

// ─── Main handler
exports.getUIConfig = async (req, res) => {
  try {
    const now  = Date.now();
    const hour = new Date().getHours();

    // ── Fetch raw DB config (cached for 5 min to avoid DB hammering)
    // We cache the RAW config, NOT the themed result —
    // so buildTheme() always uses the current hour
    if (!_dbCache || now - _dbCacheTime > CACHE_TTL) {
      const config = await UIConfig.findOne({ isActive: true }).lean();
      _dbCache     = config;
      _dbCacheTime = now;
    }

    // ── No active config in DB → return empty, frontend uses its defaults
    if (!_dbCache) {
      return res.json({});
    }

    // ── Schedule check
    if (_dbCache.schedule?.startTime && _dbCache.schedule?.endTime) {
      const start = new Date(_dbCache.schedule.startTime);
      const end   = new Date(_dbCache.schedule.endTime);
      const nowDate = new Date();
      if (nowDate < start || nowDate > end) {
        return res.json({});
      }
    }

    // ── Build themed result using CURRENT hour (runs fresh every request)
    const result = {
      title:         _dbCache.title        || "Freshlaa",
      header:        buildTheme(_dbCache, hour),  // ← always uses live hour
      featureFlags:  _dbCache.featureFlags || {},
      overrideNight: _dbCache.overrideNight || false,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(`[UIConfig] hour=${hour} → theme=${result.header?.animation?.type} gradient=${result.header?.gradient?.[0]}`);
    }

    return res.json(result);

  } catch (err) {
    console.error("[UIConfig] ERROR:", err.message);
    return res.status(500).json({ error: "Failed to load UI config" });
  }
};

// ─── Clear DB cache (call after updating config in Compass)
// Add route: POST /api/ui-config/clear-cache
exports.clearCache = (_req, res) => {
  _dbCache     = null;
  _dbCacheTime = 0;
  console.log("[UIConfig] Cache cleared manually");
  return res.json({ message: "Cache cleared — next request will fetch fresh DB config" });
};