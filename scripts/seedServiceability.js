require("dotenv").config();
const mongoose = require("mongoose");
const ServiceableArea = require("../src/models/ServiceableArea");

// ✅ Same env check like your working script
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
  process.exit(1);
}

// ✅ Connect like your other script
mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    console.log("✅ Connected to DB");

    await ServiceableArea.findOneAndUpdate(
      { pincode: "515591" },
      {
        pincode: "515591",
        areaName: "User Test Area",
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log("✅ Seeded pincode 515591");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();