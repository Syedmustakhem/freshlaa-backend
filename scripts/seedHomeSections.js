require("dotenv").config();
const mongoose = require("mongoose");
const HomeSection = require("../src/models/HomeSection");

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    await HomeSection.deleteMany();

    await HomeSection.insertMany([
      { type: "HEADER", order: 1 },

      {
        type: "BANNERS",
        order: 2,
        data: { source: "banners" },
      },

      {
        type: "SPONSORED",
        order: 3,
        data: {
          image: "https://cdn.freshlaa.com/sponsored.jpg",
        },
      },

      { type: "CATEGORIES", order: 4 },
      { type: "DAILY_NEEDS", order: 5 },
      { type: "ZOMATO", order: 6 },
      { type: "TRENDING", order: 7 },
      { type: "FOOTER", order: 8 },
    ]);

    console.log("✅ HomeSection seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
