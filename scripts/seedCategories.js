require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("../src/models/Category");
const CategorySection = require("../src/models/CategorySection");

(async () => {
  try {
    /* ---------------- CONNECT ---------------- */
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    /* ---------------- CLEAN ---------------- */
    await Category.deleteMany();
    await CategorySection.deleteMany();

    /* ---------------- SEED SECTIONS ---------------- */
    const sections = await CategorySection.insertMany([
      {
        title: "Food",
        slug: "food",
        order: 1,
        isActive: true,
      },
      {
        title: "Groceries",
        slug: "groceries",
        order: 2,
        isActive: true,
      },
      {
        title: "Beverages",
        slug: "beverages",
        order: 3,
        isActive: true,
      },
    ]);

    const foodSection = sections.find(s => s.slug === "food");
    if (!foodSection) {
      throw new Error("Food section not found");
    }

    /* ---------------- SEED CATEGORIES ---------------- */
    const categories = [
      {
        title: "Fresh Fruit Juices",
        slug: "fresh-fruit-juices",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 1,
        isActive: true,
      },
      {
        title: "Fresh Fruits & Salads",
        slug: "fresh-fruits-salads",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 2,
        isActive: true,
      },
      {
        title: "Cool Drinks",
        slug: "cool-drinks",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 3,
        isActive: true,
      },
      {
        title: "Meals, Biryani & Curries",
        slug: "meals-biryani-curries",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 4,
        isActive: true,
      },
      {
        title: "ఇంటి వంట (Home Food)",
        slug: "home-food",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 5,
        isActive: true,
      },
      {
        title: "Pizza & Noodles",
        slug: "pizza-noodles",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 6,
        isActive: true,
      },
      {
        title: "Non-Veg",
        slug: "non-veg",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 7,
        isActive: true,
      },
      {
        title: "Fast Food",
        slug: "fast-food",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 8,
        isActive: true,
      },
      {
        title: "Pani Puri & More",
        slug: "pani-puri-more",
        image: null,
        parentSlug: null,
        sectionId: foodSection._id,
        order: 9,
        isActive: true,
      },
    ];

    await Category.insertMany(categories);

    console.log("🎉 CategorySections & Categories seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
})();
