/**
 * seed.uiconfig.js
 * Run: node scripts/seed.uiconfig.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const UIConfig = require("../src/models/uiConfig.model");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/freshlaa";

// ─────────────────────────────────────────────────────────────
// SEED DATA — 12 themes
// ─────────────────────────────────────────────────────────────
const configs = [

  // ────────────────────────────────
  // 1. WAVE  ⚡  (DEFAULT ACTIVE)
  // ────────────────────────────────
  {
    name: "wave",
    title: "Freshlaa",
    isActive: true,
    overrideNight: false,
    header: {
      gradient: ["#FF5F2E", "#FF8A00"],
      animation: {
        type: "wave",
        speed: 4000,
        intensity: 300,
        density: 12,
        color: "rgba(255,255,255,0.06)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 2. LUXURY 👑
  // ────────────────────────────────
  {
    name: "luxury",
    title: "👑 Freshlaa",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#8e2de2", "#4a00e0"],
      animation: {
        type: "glow",
        speed: 3500,
        intensity: 300,
        density: 12,
        color: "rgba(255,255,255,0.18)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 3. ICE 🧊
  // ────────────────────────────────
  {
    name: "ice",
    title: "🧊 Freshlaa",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#e0f7fa", "#0288d1"],
      animation: {
        type: "shimmer",
        speed: 4000,
        intensity: 300,
        density: 12,
        color: "rgba(255,255,255,0.25)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 4. SPACE 🌌  (overrideNight → always stars)
  // ────────────────────────────────
  {
    name: "space",
    title: "🌌 Freshlaa",
    isActive: false,
    overrideNight: true,
    header: {
      gradient: ["#000428", "#004e92"],
      animation: {
        type: "stars",
        speed: 7000,
        intensity: 300,
        density: 20,
        color: "rgba(255,255,255,0.85)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 5. FESTIVAL 🎉
  // ────────────────────────────────
  {
    name: "festival",
    title: "🎉 Freshlaa",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#00C853", "#F59E0B"],
      animation: {
        type: "confetti",
        speed: 3000,
        intensity: 300,
        density: 20,
        color: "rgba(255,255,255,0.9)",
        secondaryColor: "rgba(255,138,0,0.8)",
      },
    },
    featureFlags: { flashSale: false, festivalMode: true },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 6. AURORA 🌌
  // ────────────────────────────────
  {
    name: "aurora",
    title: "✨ Freshlaa",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#1a1a2e", "#16213e", "#0f3460"],
      animation: {
        type: "aurora",
        speed: 5000,
        intensity: 300,
        density: 12,
        color: "rgba(138,92,246,0.22)",
        secondaryColor: "rgba(255,138,0,0.15)",
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 7. SUNRISE 🌅  — morning freshness
  // ────────────────────────────────
  {
    name: "sunrise",
    title: "🌅 Freshlaa",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#f83600", "#f9d423"],
      animation: {
        type: "sunrise",
        speed: 5000,
        intensity: 300,
        density: 12,
        color: "rgba(255,200,0,0.55)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 8. PULSE 💓  — flash sale urgency
  // ────────────────────────────────
  {
    name: "pulse",
    title: "🔥 Flash Sale",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#c0392b", "#e74c3c"],
      animation: {
        type: "pulse",
        speed: 1200,
        intensity: 300,
        density: 12,
        color: "rgba(255,80,80,0.18)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: true, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 9. RIPPLE 🎯  — calm & minimal
  // ────────────────────────────────
  {
    name: "ripple",
    title: "Freshlaa",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#11998e", "#38ef7d"],
      animation: {
        type: "ripple",
        speed: 3500,
        intensity: 300,
        density: 12,
        color: "rgba(255,255,255,0.35)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 10. GRADIENT WAVE 🌊  — rich & bold
  // ────────────────────────────────
  {
    name: "gradientwave",
    title: "🌊 Best Deals",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#fc4a1a", "#f7b733"],
      animation: {
        type: "gradientWave",
        speed: 5000,
        intensity: 300,
        density: 12,
        color: "rgba(255,255,255,0.08)",
        secondaryColor: "rgba(255,80,0,0.1)",
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 11. PARTICLES ✨  — premium feel
  // ────────────────────────────────
  {
    name: "particles",
    title: "✨ Top Picks",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#360033", "#0b8793"],
      animation: {
        type: "particles",
        speed: 6000,
        intensity: 300,
        density: 18,
        color: "rgba(255,255,255,0.75)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

  // ────────────────────────────────
  // 12. SCAN LINES 📺  — retro promo
  // ────────────────────────────────
  {
    name: "scanlines",
    title: "📺 Today's Deals",
    isActive: false,
    overrideNight: false,
    header: {
      gradient: ["#0f0c29", "#302b63", "#24243e"],
      animation: {
        type: "scanLines",
        speed: 3000,
        intensity: 300,
        density: 12,
        color: "rgba(255,255,255,0.9)",
        secondaryColor: null,
      },
    },
    featureFlags: { flashSale: false, festivalMode: false },
    schedule: { startTime: null, endTime: null },
  },

];

// ─────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    // Wipe existing
    const deleted = await UIConfig.deleteMany({});
    console.log(`🗑️  Deleted ${deleted.deletedCount} existing documents`);

    // Insert all
    const inserted = await UIConfig.insertMany(configs, { ordered: true });
    console.log(`🌱 Inserted ${inserted.length} UI configs:\n`);

    inserted.forEach((doc) => {
      const status = doc.isActive ? "⚡ ACTIVE" : "  inactive";
      console.log(`   ${status}  →  ${doc.name.padEnd(14)} "${doc.title}"`);
    });

    console.log("\n✅ Seeding complete!\n");
    console.log("💡 To switch themes, update isActive in Compass or run:");
    console.log('   db.uiconfigs.updateMany({}, { $set: { isActive: false } })');
    console.log('   db.uiconfigs.updateOne({ name: "festival" }, { $set: { isActive: true } })\n');

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seed();