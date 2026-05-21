const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const mongoose = require("mongoose");
const PopupModal = require("../src/models/PopupModal");
const Product = require("../src/models/Product");

async function run() {
  await connectDB();

  console.log("Seeding active PopupModal demonstration...");

  // Deactivate all existing modals
  await PopupModal.updateMany({}, { $set: { isActive: false } });

  // Find 3 products from database to showcase
  const products = await Product.find({ isActive: { $ne: false } }).limit(3);
  const dealProductIds = products.map(p => p._id);

  console.log(`Found ${dealProductIds.length} products to showcase in the deal carousel.`);

  // Create a stunning Special Deals popup modal
  const promoModal = new PopupModal({
    title: "Special Deals",
    type: "deal",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000",
    description: "✦ Available till stocks last ✦",
    textColor: "#ffffff",
    backgroundColor: "#5b21b6",
    primaryBtnText: "Explore Offer",
    redirectionType: "offer",
    redirectionId: "special-deals",
    dealProducts: dealProductIds,
    dealStartingPrice: 9,
    showOncePerUser: false, // Set to false so the user can easily test multiple times!
    isActive: true
  });

  await promoModal.save();

  console.log("✅ Beautiful Special Deals popup modal successfully seeded in database!");
  console.log("Modal Details:", JSON.stringify(promoModal, null, 2));

  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error seeding popup modal:", err);
  process.exit(1);
});
