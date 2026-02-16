require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Product.updateMany(
      { category: "maggi-noodles-vermicelli" },
      {
        $set: {
          sectionId: new mongoose.Types.ObjectId(
            "6992a19d7aeb7c43f7a5d836"
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