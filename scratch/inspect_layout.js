const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const mongoose = require("mongoose");

async function run() {
  await connectDB();
  
  // Find home layout document
  const layoutCollection = mongoose.connection.collection("homesections");
  const layouts = await layoutCollection.find().toArray();
  
  console.log("Neat Homesections:");
  for (let l of layouts) {
    console.log(`- Type: ${l.type}, Order: ${l.order}, Active: ${l.isActive}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
