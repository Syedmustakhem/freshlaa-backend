require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Product.updateMany(
      { category: "regular-rice-brown-rice" },
      {
        $set: {
          sectionId: new mongoose.Types.ObjectId(
            "6992dff98723ea230084867d"
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