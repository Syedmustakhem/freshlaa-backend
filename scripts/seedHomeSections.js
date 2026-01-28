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
        data: {
          image: [
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449776/banner_2_pnyllu.jpg",
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449794/banner1_cszkju.jpg",
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449807/banner4_yxz1bk.jpg",
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449821/banner3_kwatkg.jpg",
          ],
        },
      },

      {
        type: "SPONSORED",
        order: 3,
        data: {
          image:
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769531510/sponsored_sirn1a.jpg",
        },
      },

      // 🟢 NEW: ZEPTO STYLE GLOBAL CATEGORIES (ICON GRID)
     

      // 🔵 ORIGINAL SECTIONS (UNCHANGED)
      { type: "CATEGORIES", order: 4 },
 {
        type: "ZEPTO_CATEGORIES",
        order: 5,
        data: {
          title: "Explore Categories",
        },
      },
      { type: "DAILY_NEEDS", order: 6 },
      { type: "ZOMATO", order: 7 },
      { type: "TRENDING", order: 8 },
      { type: "FOOTER", order: 9 },
    ]);

    console.log("✅ HomeSection seeded successfully (original + zepto added)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
