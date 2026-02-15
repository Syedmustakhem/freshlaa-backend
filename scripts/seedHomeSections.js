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
      
      // 🌙 RAMADAN SPECIAL SECTION - ENHANCED
      {
        type: "RAMADAN_SPECIAL",
        order: 3,
        data: {
          title: "Ramadan Mubarak",
          subtitle: "Special Offers Just For You",
          
          // Categories for filtering
          categories: [
            { id: "all", name: "All", icon: "🌙" },
            { id: "dates", name: "Dates", icon: "🌴" },
            { id: "dry-fruits", name: "Dry Fruits", icon: "🥜" },
            { id: "beverages", name: "Beverages", icon: "🥤" },
            { id: "sweets", name: "Sweets", icon: "🍬" },
            { id: "combo", name: "Combo Packs", icon: "🎁" },
          ],

          offers: [
            // DATES SECTION
            {
              id: 1,
              title: "Premium Ajwa Dates",
              subtitle: "From Madinah - 500g",
              discount: "35% OFF",
              price: 899,
              originalPrice: 1399,
              image: "https://images.unsplash.com/photo-1609040626892-7940498f4b5f?w=400",
              tag: "🌙 Iftar Essential",
              category: "dates",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "dates_001", categoryId: "dates" }
              }
            },
            {
              id: 2,
              title: "Medjool Dates Box",
              subtitle: "Large Premium Quality",
              discount: "30% OFF",
              price: 699,
              originalPrice: 999,
              image: "https://images.unsplash.com/photo-1577003833154-a1dd1754500b?w=400",
              tag: "⭐ Bestseller",
              category: "dates",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "dates_002", categoryId: "dates" }
              }
            },
            {
              id: 3,
              title: "Safawi Dates 1kg",
              subtitle: "Rich & Soft Texture",
              discount: "25% OFF",
              price: 549,
              originalPrice: 749,
              image: "https://images.unsplash.com/photo-1590004987778-bece5c9adab6?w=400",
              tag: "🌟 Popular",
              category: "dates",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "dates_003", categoryId: "dates" }
              }
            },

            // DRY FRUITS SECTION
            {
              id: 4,
              title: "Mixed Dry Fruits",
              subtitle: "Almonds, Cashews & More",
              discount: "25% OFF",
              price: 799,
              originalPrice: 1099,
              image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
              tag: "🥜 Healthy Choice",
              category: "dry-fruits",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "dryfruits_001", categoryId: "dry-fruits" }
              }
            },
            {
              id: 5,
              title: "Premium Almonds",
              subtitle: "California - 500g",
              discount: "20% OFF",
              price: 649,
              originalPrice: 799,
              image: "https://images.unsplash.com/photo-1508747703725-719777637510?w=400",
              tag: "💪 Protein Rich",
              category: "dry-fruits",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "dryfruits_002", categoryId: "dry-fruits" }
              }
            },
            {
              id: 6,
              title: "Walnut Kernels",
              subtitle: "Premium Quality - 250g",
              discount: "28% OFF",
              price: 449,
              originalPrice: 625,
              image: "https://images.unsplash.com/photo-1590775292629-263667d43cac?w=400",
              tag: "🌰 Fresh",
              category: "dry-fruits",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "dryfruits_003", categoryId: "dry-fruits" }
              }
            },

            // BEVERAGES SECTION
            {
              id: 7,
              title: "Rooh Afza 800ml",
              subtitle: "Traditional Sharbat",
              discount: "15% OFF",
              price: 169,
              originalPrice: 199,
              image: "https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=400",
              tag: "🥤 Refreshing",
              category: "beverages",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "beverages_001", categoryId: "beverages" }
              }
            },
            {
              id: 8,
              title: "Fresh Coconut Water",
              subtitle: "Natural & Pure - Pack of 6",
              discount: "20% OFF",
              price: 240,
              originalPrice: 300,
              image: "https://images.unsplash.com/photo-1585239414652-84b99f7d7920?w=400",
              tag: "🥥 Natural",
              category: "beverages",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "beverages_002", categoryId: "beverages" }
              }
            },

            // SWEETS SECTION
            {
              id: 9,
              title: "Baklava Box",
              subtitle: "Assorted Middle Eastern",
              discount: "40% OFF",
              price: 599,
              originalPrice: 999,
              image: "https://images.unsplash.com/photo-1595924515920-7ab7faa1f42f?w=400",
              tag: "🍬 Premium",
              category: "sweets",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "sweets_001", categoryId: "sweets" }
              }
            },
            {
              id: 10,
              title: "Turkish Delight",
              subtitle: "Rose & Pistachio - 500g",
              discount: "35% OFF",
              price: 449,
              originalPrice: 699,
              image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
              tag: "🌹 Authentic",
              category: "sweets",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "sweets_002", categoryId: "sweets" }
              }
            },
            {
              id: 11,
              title: "Halwa Assortment",
              subtitle: "Traditional Indian - 1kg",
              discount: "30% OFF",
              price: 699,
              originalPrice: 999,
              image: "https://images.unsplash.com/photo-1606312619070-d48b4a4a3c0c?w=400",
              tag: "🎊 Festive",
              category: "sweets",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "sweets_003", categoryId: "sweets" }
              }
            },

            // COMBO PACKS
            {
              id: 12,
              title: "Iftar Combo Pack",
              subtitle: "Dates + Fruits + Drinks",
              discount: "45% OFF",
              price: 899,
              originalPrice: 1649,
              image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400",
              tag: "🎁 Best Value",
              category: "combo",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "combo_001", categoryId: "combo" }
              }
            },
            {
              id: 13,
              title: "Premium Gift Hamper",
              subtitle: "Dates, Nuts & Sweets",
              discount: "50% OFF",
              price: 1499,
              originalPrice: 2999,
              image: "https://images.unsplash.com/photo-1549888834-3ec93abae044?w=400",
              tag: "🎁 Gift Pack",
              category: "combo",
              inStock: true,
              featured: true,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "combo_002", categoryId: "combo" }
              }
            },
            {
              id: 14,
              title: "Suhoor Essentials",
              subtitle: "Oats, Honey, Dates & Milk",
              discount: "35% OFF",
              price: 649,
              originalPrice: 999,
              image: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400",
              tag: "☀️ Morning Pack",
              category: "combo",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "combo_003", categoryId: "combo" }
              }
            },

            // ADDITIONAL POPULAR ITEMS
            {
              id: 15,
              title: "Honey Pure 500ml",
              subtitle: "100% Natural & Organic",
              discount: "22% OFF",
              price: 389,
              originalPrice: 499,
              image: "https://images.unsplash.com/photo-1587049352846-4a222e784422?w=400",
              tag: "🍯 Pure",
              category: "beverages",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "honey_001", categoryId: "beverages" }
              }
            },
            {
              id: 16,
              title: "Fresh Fruit Basket",
              subtitle: "Seasonal Mix - 3kg",
              discount: "20% OFF",
              price: 399,
              originalPrice: 499,
              image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400",
              tag: "🍎 Fresh Daily",
              category: "combo",
              inStock: true,
              featured: false,
              action: {
                type: "navigate",
                screen: "ProductDetails",
                params: { productId: "fruits_001", categoryId: "fruits" }
              }
            },
          ],
          
          // Optional: Add date range for auto-hide after Ramadan
          startDate: "2025-02-28T00:00:00.000Z",
          endDate: "2025-03-30T23:59:59.999Z",
          
          // Badge text
          badge: "Limited Time Offer",
          
          // Show featured items first
          sortBy: "featured",
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

    console.log("✅ HomeSection seeded successfully with ENHANCED RAMADAN_SPECIAL section");
    console.log("📦 Total Ramadan Products: 16");
    console.log("🏷️  Categories: All, Dates, Dry Fruits, Beverages, Sweets, Combo Packs");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();