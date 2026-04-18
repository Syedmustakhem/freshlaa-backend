/**
 * Run this once to enable AI recommendation sections in the home layout.
 * Usage: node src/scripts/enableAISections.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const HomeSectionSchema = new mongoose.Schema({
  type: String,
  order: Number,
  isActive: Boolean,
  data: mongoose.Schema.Types.Mixed,
}, { collection: "homesections", timestamps: true });

const HomeSection = mongoose.model("HomeSection", HomeSectionSchema);

const AI_SECTION_TYPES = [
  { type: "STILL_LOOKING", order: 20 },
  { type: "ALSO_BOUGHT", order: 21 },
  { type: "SUGGESTED_PRODUCTS", order: 22 },
];

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");

  for (const sec of AI_SECTION_TYPES) {
    const existing = await HomeSection.findOne({ type: sec.type });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        console.log(`✅ ENABLED: ${sec.type} (was inactive)`);
      } else {
        console.log(`👍 ALREADY ACTIVE: ${sec.type}`);
      }
    } else {
      await HomeSection.create({ type: sec.type, order: sec.order, isActive: true, data: {} });
      console.log(`🆕 CREATED & ENABLED: ${sec.type}`);
    }
  }

  console.log("\n🎉 Done! AI sections are now active in your home layout.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
