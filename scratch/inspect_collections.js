const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const mongoose = require("mongoose");

async function run() {
  await connectDB();
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections in DB:", collections.map(c => c.name));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
