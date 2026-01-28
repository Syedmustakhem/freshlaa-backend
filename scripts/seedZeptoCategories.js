require("dotenv").config();


const mongoose = require("mongoose");
const Section = require("../src/models/CategorySection");
const Category = require("../src/models/Category");

mongoose.connect(process.env.MONGO_URI);

(async () => {
  await Section.deleteMany();
  await Category.deleteMany();

  const grocery = await Section.create({
    title: "Grocery & Kitchen",
    order: 1,
    columns: 3
  });

  const snacks = await Section.create({
    title: "Snacks & Drinks",
    order: 2,
    columns: 3
  });

  await Category.insertMany([
    {
      title: "Fruits & Vegetables",
      slug: "fruits-vegetables",
      image: "https://cdn.app/fruits.png",
      sectionId: grocery._id,
      order: 1
    },
    {
      title: "Dairy, Bread & Eggs",
      slug: "dairy-bread-eggs",
      image: "https://cdn.app/dairy.png",
      sectionId: grocery._id,
      order: 2
    }
  ]);

  console.log("✅ Zepto categories seeded");
  process.exit();
})();
