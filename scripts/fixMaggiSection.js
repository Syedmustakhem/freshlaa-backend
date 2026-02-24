require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Product.updateMany(
      { category: "maggi-noodles-papad-fryums" },
      {
        $set: {
          sectionId: new mongoose.Types.ObjectId(
            "6992dff9d81d5080ef7a1746"
          ),
        },
      }
    );

    console.log("✅ Updated products:", result.modifiedCount);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();