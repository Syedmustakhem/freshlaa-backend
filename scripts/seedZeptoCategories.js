require("dotenv").config();

const mongoose = require("mongoose");
const Section = require("../src/models/CategorySection");
const Category = require("../src/models/Category");

mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    await Section.deleteMany();
    await Category.deleteMany();

    // 🔝 SECTIONS WITH PHOTOS (VISIBLE ON TOP)
    const sections = await Section.insertMany([
      {
        title: "Chicken Biryani Masala",
        image: "https://cdn.app/sections/chicken-biryani-masala.png",
        order: 1,
        columns: 3,
      },
      {
        title: "Basmati Rice",
        image: "https://cdn.app/sections/basmati-rice.png",
        order: 2,
        columns: 3,
      },
      {
        title: "Regular Rice",
        image: "https://cdn.app/sections/regular-rice.png",
        order: 3,
        columns: 3,
      },
      {
        title: "Atta, Dal & Sugar",
        image: "https://cdn.app/sections/atta-dal-sugar.png",
        order: 4,
        columns: 3,
      },
      {
        title: "Pappad & Pickles",
        image: "https://cdn.app/sections/pappad-pickles.png",
        order: 5,
        columns: 3,
      },
      {
        title: "Maggi & Noodles",
        image: "https://cdn.app/sections/maggi-noodles.png",
        order: 6,
        columns: 3,
      },
      {
        title: "Beans & Peas",
        image: "https://cdn.app/sections/beans-peas.png",
        order: 7,
        columns: 3,
      },
      {
        title: "Home Cleaning Products",
        image: "https://cdn.app/sections/home-cleaning.png",
        order: 8,
        columns: 3,
      },
      {
        title: "Bathing Soaps & Shampoo Products",
        image: "https://cdn.app/sections/bathing-soaps-shampoo.png",
        order: 9,
        columns: 3,
      },
      {
        title: "Sweets & Snacks",
        image: "https://cdn.app/sections/sweets-snacks.png",
        order: 10,
        columns: 3,
      },
      {
        title: "Chocolates & Biscuits",
        image: "https://cdn.app/sections/chocolates-biscuits.png",
        order: 11,
        columns: 3,
      },
      {
        title: "Berries",
        image: "https://cdn.app/sections/berries.png",
        order: 12,
        columns: 3,
      },
    ]);

    console.log("✅ Sections with images seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
})();
