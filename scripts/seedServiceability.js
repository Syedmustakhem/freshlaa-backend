const mongoose = require("mongoose");
require("dotenv").config();
const ServiceableArea = require("../src/models/ServiceableArea");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    await ServiceableArea.findOneAndUpdate(
      { pincode: "515591" },
      { pincode: "515591", areaName: "User Test Area", isActive: true },
      { upsert: true, new: true }
    );

    console.log("Seeded pincode 515591");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
