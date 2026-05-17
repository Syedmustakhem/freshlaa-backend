const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const ServiceableArea = require("../src/models/ServiceableArea");
const AppConfig = require("../src/models/AppConfig");

async function run() {
  await connectDB();

  const config = await AppConfig.findOne();
  console.log("AppConfig deliveryTiming:", config?.deliveryTiming);

  const areas = await ServiceableArea.find({ isActive: true }).limit(5);
  console.log(`Found ${areas.length} active serviceable areas.`);

  for (let area of areas) {
    console.log("Area:", {
      pincode: area.pincode,
      isInstantAvailable: area.isInstantAvailable,
      estimatedTime: area.estimatedTime
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
