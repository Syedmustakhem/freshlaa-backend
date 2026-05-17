const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const AppConfig = require("../src/models/AppConfig");
const ServiceableArea = require("../src/models/ServiceableArea");

async function run() {
  await connectDB();
  
  const config = await AppConfig.findOne().lean();
  console.log("AppConfig in DB:", JSON.stringify(config, null, 2));

  const areas = await ServiceableArea.find().lean();
  console.log("ServiceableAreas in DB count:", areas.length);
  for (let area of areas) {
    console.log("ServiceableArea in DB:", JSON.stringify(area, null, 2));
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
