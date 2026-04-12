const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const Product = require("./src/models/Product");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    
    const products = await Product.find({ isFlashSale: true });
    console.log(`Found ${products.length} flash sale products:`);
    
    products.forEach(p => {
      console.log(`- ${p.name}: Price=${p.flashSalePrice}, End=${p.flashSaleEndTime}, Active=${p.isActive}, Stock=${p.stock}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
