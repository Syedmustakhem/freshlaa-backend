require("dotenv").config();

const mongoose = require("mongoose");
const Section = require("../src/models/CategorySection");
const Category = require("../src/models/Category");

mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    await Section.deleteMany();
    await Category.deleteMany();

    /* ================= SECTIONS ================= */
    const sections = await Section.insertMany([
      { title: "Chicken Biryani Masala", image: "https://cdn.app/sections/chicken-biryani-masala.png", order: 1, columns: 3 },
      { title: "Basmati Rice", image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769966804/basmati_kwkkg5.jpg", order: 2, columns: 3 },
      { title: "Regular Rice", image: "https://cdn.app/sections/regular-rice.png", order: 3, columns: 3 },
      { title: "Atta, Dal & Sugar", image: "https://cdn.app/sections/atta-dal-sugar.png", order: 4, columns: 3 },
      { title: "Pappad & Pickles", image: "https://cdn.app/sections/pappad-pickles.png", order: 5, columns: 3 },
      { title: "Maggi & Noodles", image: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769963167/maggie_j6qf1g.jpg", order: 6, columns: 3 },
      { title: "Beans & Peas", image: "https://cdn.app/sections/beans-peas.png", order: 7, columns: 3 },
      { title: "Home Cleaning Products", image: "https://cdn.app/sections/home-cleaning.png", order: 8, columns: 3 },
      { title: "Bathing Soaps & Shampoo Products", image: "https://cdn.app/sections/bathing-soaps-shampoo.png", order: 9, columns: 3 },
      { title: "Sweets & Snacks", image: "https://cdn.app/sections/sweets-snacks.png", order: 10, columns: 3 },
      { title: "Chocolates & Biscuits", image: "https://cdn.app/sections/chocolates-biscuits.png", order: 11, columns: 3 },
      { title: "Berries", image: "https://cdn.app/sections/berries.png", order: 12, columns: 3 },
    ]);

    /* ================= SUB-CATEGORIES MAP ================= */
    const SUB_CATEGORIES = {
      "Chicken Biryani Masala": ["Ready Masala Mixes", "Biryani Masala", "Chicken Masala", "Meat Masala", "Whole Spices"],
      "Basmati Rice": ["Premium Basmati", "Everyday Basmati", "Aged Basmati", "Mini Pack", "Bulk Pack"],
      "Regular Rice": ["Sona Masoori", "Ponni Rice", "Idli Rice", "Broken Rice", "Local Varieties"],
      "Atta, Dal & Sugar": ["Wheat Atta", "Multigrain Atta", "Dals", "Sugar & Jaggery", "Organic Staples"],
      "Pappad & Pickles": ["Papad", "Mango Pickles", "Mixed Pickles", "Chutneys", "Condiments"],
      "Maggi & Noodles": ["Instant Noodles", "Cup Noodles", "Pasta", "Vermicelli", "Ready Meals"],
      "Beans & Peas": ["Fresh Beans", "Green Peas", "Frozen Veggies", "Sprouts", "Mixed Vegetables"],
      "Home Cleaning Products": ["Floor Cleaners", "Dishwash", "Toilet Cleaners", "Laundry", "Disinfectants"],
      "Bathing Soaps & Shampoo Products": ["Bathing Soaps", "Body Wash", "Shampoos", "Conditioners", "Hair Oils"],
      "Sweets & Snacks": ["Indian Sweets", "Namkeen", "Mixtures", "Fryums", "Festive Packs"],
      "Chocolates & Biscuits": ["Chocolates", "Cookies", "Cream Biscuits", "Marie & Digestive", "Kids Snacks"],
      "Berries": ["Fresh Berries", "Dried Berries", "Frozen Berries", "Exotic Fruits", "Organic Fruits"],
    };

    /* ================= INSERT SUB-CATEGORIES ================= */
    const categories = [];

    sections.forEach(section => {
      const subs = SUB_CATEGORIES[section.title] || [];

      subs.forEach((name, index) => {
        categories.push({
          title: name,
          slug: `${section.title}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          sectionId: section._id,
          order: index + 1,
          isActive: true,
        });
      });
    });

    await Category.insertMany(categories);

    console.log("✅ Sections + Sub-Categories seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
})();
