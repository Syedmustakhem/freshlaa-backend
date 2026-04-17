require('dotenv').config();
const mongoose = require('mongoose');
const HomeSection = require('../src/models/HomeSection');

async function run() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("MONGO_URI is missing in .env");
            process.exit(1);
        }
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        const types = ["STILL_LOOKING", "ALSO_BOUGHT", "SUGGESTED_PRODUCTS"];
        
        const result = await HomeSection.updateMany(
            { type: { $in: types } },
            { $set: { isActive: true } }
        );

        console.log(`Updated ${result.modifiedCount} existing sections to isActive: true.`);
        
        // Also check if they exist, if not, create them (mirroring self-healing logic)
        for (const type of types) {
            const exists = await HomeSection.findOne({ type });
            if (!exists) {
                await HomeSection.create({
                    type,
                    order: type === "STILL_LOOKING" ? 20 : type === "ALSO_BOUGHT" ? 21 : 22,
                    isActive: true,
                    data: {}
                });
                console.log(`Created missing section: ${type}`);
            }
        }

        console.log("Database sync complete.");
        process.exit(0);
    } catch (err) {
        console.error("Sync failed:", err);
        process.exit(1);
    }
}

run();
