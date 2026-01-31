require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("../src/models/Product");
const Category = require("../src/models/Category");

async function runMigration() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to DB");

  const categories = await Category.find({ isActive: true }).lean();

  if (!categories.length) {
    console.log("❌ No categories found");
    process.exit(0);
  }

  console.log(`📦 Loaded ${categories.length} categories`);

  const products = await Product.find({ isActive: true }).lean();
  console.log(`🛒 Found ${products.length} products`);

  let updated = 0;

  for (const product of products) {
    const rawCategory = (product.category || "").toLowerCase().trim();

    // 1️⃣ Try exact slug match
    let matched = categories.find(c => c.slug === rawCategory);

    // 2️⃣ Try title fuzzy match
    if (!matched) {
      matched = categories.find(c =>
        rawCategory.includes(c.title.toLowerCase()) ||
        c.title.toLowerCase().includes(rawCategory)
      );
    }

    // 3️⃣ Try keyword match
    if (!matched) {
      matched = categories.find(c => {
        const words = c.title.toLowerCase().split(" ");
        return words.some(w => rawCategory.includes(w));
      });
    }

    if (!matched) {
      console.log(
        `⚠️ No category match for product: "${product.name}" → "${product.category}"`
      );
      continue;
    }

    // 🔥 UPDATE PRODUCT
    await Product.updateOne(
      { _id: product._id },
      { $set: { category: matched.slug } }
    );

    updated++;
    console.log(
      `✅ ${product.name}: "${rawCategory}" → "${matched.slug}"`
    );
  }

  console.log(`\n🎉 Migration complete. Updated ${updated} products.`);
  process.exit(0);
}

runMigration().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
