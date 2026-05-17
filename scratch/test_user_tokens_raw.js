const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
  await connectDB();
  
  // Use .lean() to get raw MongoDB documents
  const users = await User.find({
    isBlocked: false,
    $or: [
      { fcmToken: { $exists: true, $ne: null, $ne: "" } },
      { expoPushToken: { $exists: true, $ne: null, $ne: "" } }
    ]
  }).limit(5).select("_id fcmToken expoPushToken name phone").lean();

  console.log("Fetched raw users count:", users.length);
  for (let u of users) {
    console.log("Raw User in DB:", {
      id: u._id,
      phone: u.phone,
      fcmToken_val: u.fcmToken,
      fcmToken_type: typeof u.fcmToken,
      expoPushToken_val: u.expoPushToken,
      expoPushToken_type: typeof u.expoPushToken
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
