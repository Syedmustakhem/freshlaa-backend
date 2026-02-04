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
    // already migrated
    if (
      product.subCategory &&
      categories.some(c => c.slug === product.subCategory)
    ) {
      skipped++;
      continue;
    }

    const source =
      product.subCategory ||
      product.category ||
      "";

    if (!source) {
      skipped++;
      continue;
    }

    const raw = source.toLowerCase().trim();

    // 1️⃣ exact slug match
    let matched = categories.find(c => c.slug === raw);

    // 2️⃣ exact title match (normalized)
    if (!matched) {
      matched = categories.find(c =>
        c.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
        raw.replace(/[^a-z0-9]/g, "")
      );
    }

    // 3️⃣ safe word overlap (length > 4)
    if (!matched) {
      matched = categories.find(c => {
        const words = c.title.toLowerCase().split(" ");
        return words.some(w => w.length > 4 && raw.includes(w));
      });
    }

    if (!matched) {
      console.log(`⚠️ Skipped: ${product.name} → "${source}"`);
      skipped++;
      continue;
    }

    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          subCategory: matched.slug,   // ✅ THIS IS THE FIX
          category: matched.slug,      // keep backward compatibility
        },
      }
    );

    updated++;
    console.log(
      `✅ ${product.name}: "${source}" → "${matched.slug}"`
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
