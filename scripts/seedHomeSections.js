require("dotenv").config();
const mongoose = require("mongoose");
const HomeSection = require("../src/models/HomeSection");

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

       {
    type: "ZEPTO_CATEGORIES",
    order: 4,
    data: {
      title: "Shop by Categories"
    }
  },
      // 🔥 SERVER-DRIVEN CATEGORY SECTIONS
      {
       type: "CATEGORIES",

        order: 5,
        data: {
          title: "Dry Fruits & Combos",
          categorySlug: "dry-fruits",
          layout: "GRID_3",
        },
      },
      {
      type: "CATEGORIES",
        order: 6,
        data: {
          title: "Daily Needs",
          categorySlug: "daily-needs",
          layout: "GRID_3",
        },
      },
      {
 type: "CATEGORIES",
        order: 7,
        data: {
          title: "Ready to Eat",
          categorySlug: "ready-to-eat",
          layout: "GRID_3",
        },
      },
      {
    type: "CATEGORIES",
        order: 8,
        data: {
          title: "Trending Products",
          categorySlug: "trending",
          layout: "HORIZONTAL",
        },
      },

      { type: "FOOTER", order: 8 },
    ]);

    console.log("✅ HomeSection seeded (SERVER DRIVEN)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
