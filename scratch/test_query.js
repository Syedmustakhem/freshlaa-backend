const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
  await connectDB();
  
  // Use BSON type checking to ensure they are actual strings and not null/undefined
  const users = await User.find({
    isBlocked: false,
    $or: [
      { fcmToken: { $type: "string", $ne: "" } },
      { expoPushToken: { $type: "string", $ne: "" } }
    ]
  }).limit(5).select("_id fcmToken expoPushToken name phone").lean();

  console.log("Fetched robust users count:", users.length);
  for (let u of users) {
    console.log("Robust User in DB:", {
      id: u._id,
      phone: u.phone,
      fcmToken: u.fcmToken,
      fcmToken_type: typeof u.fcmToken,
      expoPushToken: u.expoPushToken,
      expoPushToken_type: typeof u.expoPushToken
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
