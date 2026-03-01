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

 {
type:"QUICK_FILTERS",
order:3,
data:{

title:"Quick Picks",

filters:[

{
id:"all",
title:"All",
icon:"https://img.icons8.com/?size=100&id=Ypj9RsvB5YHH&format=png&color=000000",

layout:[
{
type:"DEFAULT_HOME"
}
]

},

{
id:"ramadan",
title:"Ramadan",
icon:"https://img.icons8.com/?size=100&id=F8DOpjoXdb4i&format=png&color=000000",

layout:[

{
type:"RAMADAN_SPECIAL"
},

{
type:"PRODUCTS",
query:{
quickFilter:"ramadan"
}
}

]

},

{
id:"dry-fruits-pan",
title:"DryFruitsPan",
icon:"https://cdn-icons-png.flaticon.com/512/415/415733.png",

layout:[

{
type:"PRODUCTS",
query:{
category:"dry-fruits"
}
}

]

},

{
id:"vegetables",
title:"Veggies",
icon:"https://img.icons8.com/?size=100&id=RjZXjgtbZhcv&format=png&color=000000",

layout:[

{
type:"PRODUCTS",
query:{
quickFilter:"vegetables"
}
}

]

},

{
id:"deals",
title:"Deals",
icon:"https://cdn-icons-png.flaticon.com/512/3523/3523887.png",

layout:[

{
type:"PRODUCTS",
query:{
quickFilter:"deals"
}
}

]

},

{
id:"snacks",
title:"Snacks",
icon:"https://cdn-icons-png.flaticon.com/512/2553/2553691.png",

layout:[

{
type:"PRODUCTS",
query:{
quickFilter:"snacks"
}
}

]

}

]

}
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
        data: {
          schemaVersion: 1,           // ✅ moved inside data (not a top-level field)
          layout: "SPLIT_50",
          imagePosition: "RIGHT",
          content: {
            sponsoredLabel: "Sponsored",
            title: "Fresh Picks for Smart Shoppers",
            subtitle: "Carefully curated partner deals, just for you",
            ctaText: "Explore Deals →",
          },
          image: {
            url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1770194936/ChatGPT_Image_Feb_4_2026_01_35_04_AM_maxifg.png",
            resizeMode: "cover",
          },
          style: {
            backgroundColor: "#F4FAF6",
            titleColor: "#1f3d2b",
            subtitleColor: "#4f6f5f",
            ctaColor: "#2e7d32",
          },
          animation: {
            sponsoredPulse: true,
            ctaSlide: true,
          },
        },
      },

      { type: "CATEGORIES",       order: 6, data: {} },

      {
        type: "ZEPTO_CATEGORIES",
        order: 7,
        data: { title: "Explore Categories" },
      },

      // ✅ CATEGORY_CAROUSEL — comma fixed, unique order
     

      { type: "DAILY_NEEDS",    order: 8,  data: {} },  // ✅ order fixed from 8 → 9
      { type: "QUICK_REORDER",  order: 9, data: {} },
      { type: "ZOMATO",         order: 10, data: {} },
      { type: "TRENDING",       order: 11, data: {} },
       {
        type: "CATEGORY_CAROUSEL",
        order: 12,
        data: {},
      },
      { type: "FOOTER",         order: 13, data: {} },
    ]);

    console.log("✅ HomeSection seeded successfully");
    console.log("📦 Total Ramadan Products: 16");
    console.log("🏷️  Categories: All, Dates, Dry Fruits, Beverages, Sweets, Combo Packs");
    console.log("🎠  CategoryCarousel added at order 8");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();