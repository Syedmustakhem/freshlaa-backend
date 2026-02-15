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
              type: "image",
              image:
                "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769856678/WhatsApp_Image_2026-01-31_at_4.20.32_PM_luhj0j.jpg",
              action: {
                type: "navigate",
                screen: "OffersScreen",
              },
            },
          },
        },
      },
      {
        type: "ACTIVE_ORDER",
        order: 2,
        data: {},
      },
      
      // 👇 NEW - Ramadan Special Section
      {
        type: "RAMADAN_SPECIAL",
        order: 3,
        data: {
          title: "Ramadan Mubarak",
          subtitle: "Special Offers Just For You",
          offers: [
            {
              id: 1,
              title: "Dates Special",
              subtitle: "Premium Quality",
              discount: "30% OFF",
              image: "https://images.unsplash.com/photo-1609040626892-7940498f4b5f?w=400",
              tag: "🌙 Iftar Essential",
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { categoryId: "dates" }
              }
            },
            {
              id: 2,
              title: "Dry Fruits Pack",
              subtitle: "Healthy Snacking",
              discount: "25% OFF",
              image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
              tag: "⭐ Bestseller",
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { categoryId: "dry-fruits" }
              }
            },
            {
              id: 3,
              title: "Sweet Combos",
              subtitle: "Ramadan Special",
              discount: "40% OFF",
              image: "https://images.unsplash.com/photo-1595924515920-7ab7faa1f42f?w=400",
              tag: "🎁 Gift Pack",
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { categoryId: "sweets" }
              }
            },
            {
              id: 4,
              title: "Fresh Fruits",
              subtitle: "Daily Essentials",
              discount: "20% OFF",
              image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400",
              tag: "🍎 Fresh Daily",
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { categoryId: "fruits" }
              }
            },
          ],
          // Optional: Add date range for auto-hide after Ramadan
          startDate: "2025-02-28T00:00:00.000Z",
          endDate: "2025-03-30T23:59:59.999Z",
        },
      },

      {
        type: "BANNERS",
        order: 4,
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
        order: 5,
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

      { type: "CATEGORIES", order: 6 },

      {
        type: "ZEPTO_CATEGORIES",
        order: 7,
        data: {
          title: "Explore Categories",
        },
      },

      { type: "DAILY_NEEDS", order: 8 },
      
      {
        type: "QUICK_REORDER",
        order: 9,
        data: {},
      },

      { type: "ZOMATO", order: 10 },
      { type: "TRENDING", order: 11 },
      { type: "FOOTER", order: 12 },
    ]);

    console.log("✅ HomeSection seeded successfully with RAMADAN_SPECIAL section");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();