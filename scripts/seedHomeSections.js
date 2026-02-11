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
      {
        type: "HEADER",
        order: 1,
        data: {
          search: {
            placeholder: 'Search "Milk"',
            action: {
              type: "navigate",
              screen: "SearchScreen",
            },
            rightCTA: {
  visible: true,
  type: "image",                // 👈 NEW
  image:
    "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769856678/WhatsApp_Image_2026-01-31_at_4.20.32_PM_luhj0j.jpg",
  // title: "Pickles",
  // subtitle: "UP TO 85% OFF",
  action: {
    type: "navigate",
    screen: "OffersScreen",
  },
}

          },
        },
      },
{
  type: "ACTIVE_ORDER",
  order: 2,
  data: {},
},

      {
        type: "BANNERS",
        order: 3,
        data: {
          image: [
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449776/banner_2_pnyllu.jpg",
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769879421/combo_qlfc2t.jpg",
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449807/banner4_yxz1bk.jpg",
            "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449821/banner3_kwatkg.jpg",
          ],
        },
      },

    {
  type: "SPONSORED",
  order: 4,
  schemaVersion: 1,
  data: {
    layout: "SPLIT_50",
    imagePosition: "RIGHT",

    content: {
      sponsoredLabel: "Sponsored",
      title: "Fresh Picks for Smart Shoppers",
      subtitle: "Carefully curated partner deals, just for you",
      ctaText: "Explore Deals →"
    },

    image: {
      url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1770194936/ChatGPT_Image_Feb_4_2026_01_35_04_AM_maxifg.png",
      resizeMode: "cover"
    },

    style: {
      backgroundColor: "#F4FAF6",
      titleColor: "#1f3d2b",
      subtitleColor: "#4f6f5f",
      ctaColor: "#2e7d32"
    },

    animation: {
      sponsoredPulse: true,
      ctaSlide: true
    }
  }
},


      { type: "CATEGORIES", order: 5 },

      {
        type: "ZEPTO_CATEGORIES",
        order: 6,
        data: {
          title: "Explore Categories",
        },
      },

      { type: "DAILY_NEEDS", order: 7 },
      {
  type: "QUICK_REORDER",
  order: 8,
  data: {},
},

      { type: "ZOMATO", order: 9 },
      { type: "TRENDING", order: 10 },
      { type: "FOOTER", order: 11 },
    ]);

    console.log("✅ HomeSection seeded successfully with HEADER search CTA");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
