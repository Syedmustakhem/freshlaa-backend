require("dotenv").config();
const mongoose = require("mongoose");

const CategorySection = require("../src/models/CategorySection");
const Category = require("../src/models/Category");

(async () => {
  try {
    /* ================= CONNECT ================= */
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    /* ================= CLEAN ================= */
    await Category.deleteMany();
    await CategorySection.deleteMany();

    /* ================= SECTIONS ================= */
    const sections = await CategorySection.insertMany([
      {
        title: "Badam & Seeds",
        slug: "badam-seeds",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218096/WhatsApp_Image_2026-02-16_at_10.12.27_AM_ergpug.jpg",
        order: 1,
        columns: 3,
        isActive: true,
      },
      {
        title: "Oats & Honey",
        slug: "oats-honey",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769967105/saffola_rhbxha.jpg",
        order: 2,
        columns: 3,
        isActive: true,
      },
      {
        title: "Home Made Masala Powders",
        slug: "home-made-masala-powders",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771217987/WhatsApp_Image_2026-02-16_at_10.12.24_AM_u3hbxg.jpg",
        order: 3,
        columns: 3,
        isActive: true,
      },
      {
        title: "Regular Rice",
        slug: "regular-rice",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769967369/regular_rice_o4idpp.jpg",
        order: 4,
        columns: 3,
        isActive: true,
      },
      {
        title: "Atta, Dal & Sugar",
        slug: "atta-dal-sugar",
        image: "hhttps://res.cloudinary.com/dxiujfq7i/image/upload/v1771218258/WhatsApp_Image_2026-02-16_at_10.12.25_AM2_mvo6er.jpg",
        order: 5,
        columns: 3,
        isActive: true,
      },
      
      {
        title: "Maggi & Noodles",
        slug: "maggi-noodles",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769963167/maggie_j6qf1g.jpg",
        order: 6,
        columns: 3,
        isActive: true,
      },
      {
        title: "Home Cleaning Products",
        slug: "home-cleaning-products",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771219422/WhatsApp_Image_2026-02-16_at_10.12.26_AM_dlkqic.jpg",
        order: 7,
        columns: 3,
        isActive: true,
      },
      {
        title: "Bathing Soaps & Shampoo Products",
        slug: "bathing-soaps-shampoo",
        image: "https://cdn.app/sections/bathing-soaps-shampoo.png",
        order: 8,
        columns: 3,
        isActive: true,
      },
      {
        title: "Chocolates & Biscuits",
        slug: "chocolates-biscuits",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218096/WhatsApp_Image_2026-02-16_at_10.12.26_AM_w6nuqu.jpg",
        order: 9,
        columns: 3,
        isActive: true,
      },
       {
        title: "Ryhthu & Angadi",
        slug: "rythu-angadi",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218096/WhatsApp_Image_2026-02-16_at_10.12.26_AM_w6nuqu.jpg",
        order: 10,
        columns: 3,
        isActive: true,
      },
    ]);

    /* ================= SUB-CATEGORIES ================= */
    const SUB_CATEGORIES = {
      "Badam & Seeds": ["Badam & Cashew", "All Seeds", "Roasted Items", "Dry Berries", "Mixed Dryfruits"],
      "Oats & Honey": ["Oats", "Honey", "Weight Loss", "Mixed Vegetables"],
      "Home Made Masala Powders": ["Home made Masala Powders", "Masala Powders", " All Spices", "Spices Powder"],
      "Regular Rice": ["Sona Masoori", "Ponni Rice", "Idli Rice", "Broken Rice"],
      "Atta, Dal & Sugar": [" Atta & Oil", "Ghee", "Dal & Pulses", "Olive Oil"],
      "Maggi & Noodles": ["Pasta & Noodles", " Roasted Semiya", "Pasta", "Vermicelli"],
      "Home Cleaning Products": ["Floor Cleaners", "Dishwash", "Toilet Cleaners", "Laundry"],
      "Bathing Soaps & Shampoo Products": ["Bathing Soaps", "Body Wash", "Shampoos", "Hair Oils"],
      "Chocolates & Biscuits": ["Chocoklates", "Biscuts", "Sweet", "Hot item"],
      "Rythu & Angadi": ["urea","pesticides","nature","pure","fresh","natural","fresh"],
    };

    /* ================= INSERT SUB-CATEGORIES ================= */
    const categories = [];

    sections.forEach((section) => {
      const subs = SUB_CATEGORIES[section.title] || [];

      subs.forEach((name, index) => {
        categories.push({
          title: name,
          slug: `${section.slug}-${name}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
          parentSlug: section.slug,
          sectionId: section._id,
          order: index + 1,
          isActive: true,
        });
      });
    });

    await Category.insertMany(categories);

    console.log("🎉 Sections & Sub-Categories seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
})();
