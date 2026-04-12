const mongoose = require("mongoose");
const HomeSection = require("./src/models/HomeSection");
require("dotenv").config();

async function initSections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const newSections = [
      { type: "TRENDING_TICKER", order: 1.5, isActive: false },
      { type: "FLASH_SALE", order: 1.6, isActive: false },
      { type: "STILL_LOOKING", order: 20, isActive: false },
      { type: "ALSO_BOUGHT", order: 21, isActive: false },
      { type: "SUGGESTED_PRODUCTS", order: 22, isActive: false },
    ];

    for (const sec of newSections) {
      const exists = await HomeSection.findOne({ type: sec.type });
      if (!exists) {
        await HomeSection.create(sec);
        console.log(`Created section: ${sec.type}`);
      } else {
        console.log(`Section already exists: ${sec.type}`);
      }
    }

    mongoose.connection.close();
    console.log("Done");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

initSections();
