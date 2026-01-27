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
        data: { image: [
           "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449776/banner_2_pnyllu.jpg",
           "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449794/banner1_cszkju.jpg",
           "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449807/banner4_yxz1bk.jpg",
           "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449821/banner3_kwatkg.jpg",
        ] },
      },

      {
        type: "SPONSORED",
        order: 3,
        data: {
          image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769531510/sponsored_sirn1a.jpg",
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
