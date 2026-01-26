const mongoose = require("mongoose");
const Category = require("../src/models/Category");

mongoose.connect("");

const categories = [
  { name: "Fresh Fruits", slug: "fresh-fruits" },
  { name: "Cool Drinks", slug: "cool-drinks" },
  { name: "Dosa & More", slug: "dosa-more" },
  { name: "Biryani", slug: "biryani" },
  { name: "Curries", slug: "curries" },
  { name: "ఇంటి వంట (Home Food)", slug: "ఇంటి వంట (home food)" },
  { name: "Non-Veg", slug: "non-veg" },
  { name: "Fast Food", slug: "fast-food" },
  { name: "Pani Puri & More", slug: "pani-puri-more" },
];

(async () => {
  await Category.deleteMany(); // optional (only first time)
  await Category.insertMany(categories);
  console.log("✅ Categories seeded successfully");
  process.exit();
})();
