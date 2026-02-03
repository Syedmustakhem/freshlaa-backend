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
        image: "https://cdn.app/sections/chocolates-biscuits.png",
        order: 1,
        columns: 3,
        isActive: true,
      },
      {
        title: "Berries",
        slug: "berries",
        image: "https://cdn.app/sections/berries.png",
        order: 2,
        columns: 3,
        isActive: true,
      },
      {
        title: "Oats & Honey",
        slug: "oats-honey",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769967105/saffola_rhbxha.jpg",
        order: 3,
        columns: 3,
        isActive: true,
      },
      {
        title: "Home Made Masala Powders",
        slug: "home-made-masala-powders",
        image: "https://cdn.app/sections/chicken-biryani-masala.png",
        order: 4,
        columns: 3,
        isActive: true,
      },
      {
        title: "Basmati Rice",
        slug: "basmati-rice",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769966804/basmati_kwkkg5.jpg",
        order: 5,
        columns: 3,
        isActive: true,
      },
      {
        title: "Regular Rice",
        slug: "regular-rice",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769967369/regular_rice_o4idpp.jpg",
        order: 6,
        columns: 3,
        isActive: true,
      },
      {
        title: "Atta, Dal & Sugar",
        slug: "atta-dal-sugar",
        image: "https://cdn.app/sections/atta-dal-sugar.png",
        order: 7,
        columns: 3,
        isActive: true,
      },
      {
        title: "Pappad & Pickles",
        slug: "pappad-pickles",
        image: "https://cdn.app/sections/pappad-pickles.png",
        order: 8,
        columns: 3,
        isActive: true,
      },
      {
        title: "Maggi & Noodles",
        slug: "maggi-noodles",
        image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769963167/maggie_j6qf1g.jpg",
        order: 9,
        columns: 3,
        isActive: true,
      },
      {
        title: "Home Cleaning Products",
        slug: "home-cleaning-products",
        image: "https://cdn.app/sections/home-cleaning.png",
        order: 10,
        columns: 3,
        isActive: true,
      },
      {
        title: "Bathing Soaps & Shampoo Products",
        slug: "bathing-soaps-shampoo",
        image: "https://cdn.app/sections/bathing-soaps-shampoo.png",
        order: 11,
        columns: 3,
        isActive: true,
      },
      {
        title: "Chocolates & Biscuits",
        slug: "chocolates-biscuits",
        image: "https://cdn.app/sections/sweets-snacks.png",
        order: 12,
        columns: 3,
        isActive: true,
      },
    ]);

    /* ================= SUB-CATEGORIES ================= */
    const SUB_CATEGORIES = {
      "Badam & Seeds": ["Chocolates", "Cookies", "Cream Biscuits", "Marie Digestive", "Kids Snacks"],
      "Berries": ["Fresh Berries", "Dried Berries", "Frozen Berries", "Exotic Fruits", "Organic Fruits"],
      "Oats & Honey": ["Fresh Oats", "Pure Honey", "Sprouts", "Mixed Vegetables"],
      "Home Made Masala Powders": ["Biryani Masala", "Chicken Masala", "Meat Masala", "Whole Spices"],
      "Basmati Rice": ["Premium Basmati", "Everyday Basmati", "Aged Basmati", "Mini Pack", "Bulk Pack"],
      "Regular Rice": ["Sona Masoori", "Ponni Rice", "Idli Rice", "Broken Rice"],
      "Atta, Dal & Sugar": ["Wheat Atta", "Multigrain Atta", "Dals", "Sugar Jaggery"],
      "Pappad & Pickles": ["Papad", "Mango Pickles", "Mixed Pickles", "Chutneys"],
      "Maggi & Noodles": ["Instant Noodles", "Cup Noodles", "Pasta", "Vermicelli"],
      "Home Cleaning Products": ["Floor Cleaners", "Dishwash", "Toilet Cleaners", "Laundry"],
      "Bathing Soaps & Shampoo Products": ["Bathing Soaps", "Body Wash", "Shampoos", "Hair Oils"],
      "Chocolates & Biscuits": ["Indian Sweets", "Namkeen", "Mixtures", "Festive Packs"],
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
