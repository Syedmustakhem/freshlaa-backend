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
  let skipped = 0;

  for (const product of products) {
    if (!product.category || typeof product.category !== "string") {
      skipped++;
      continue;
    }

    const raw = product.category.toLowerCase().trim();

    // 1️⃣ Exact slug match
    let matched = categories.find(c => c.slug === raw);

    // 2️⃣ Exact title match (cleaned)
    if (!matched) {
      matched = categories.find(c =>
        c.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
        raw.replace(/[^a-z0-9]/g, "")
      );
    }

    // 3️⃣ Word overlap (SAFE version)
    if (!matched) {
      matched = categories.find(c => {
        const words = c.title.toLowerCase().split(" ");
        return words.filter(w => w.length > 3).some(w => raw.includes(w));
      });
    }

    if (!matched) {
      console.log(
        `⚠️ Skipped: "${product.name}" → "${product.category}"`
      );
      skipped++;
      continue;
    }

    await Product.updateOne(
      { _id: product._id },
      { $set: { category: matched.slug } }
    );

    updated++;
    console.log(
      `✅ ${product.name}: "${product.category}" → "${matched.slug}"`
    );
  }

  console.log("\n🎉 MIGRATION SUMMARY");
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️ Skipped: ${skipped}`);

  process.exit(0);
}

runMigration().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
