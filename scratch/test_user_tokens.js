const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
  await connectDB();
  
  const users = await User.find({
    isBlocked: false,
    $or: [
      { fcmToken: { $exists: true, $ne: null, $ne: "" } },
      { expoPushToken: { $exists: true, $ne: null, $ne: "" } }
    ]
  }).limit(5).select("_id fcmToken expoPushToken name phone");

  console.log("Fetched users count:", users.length);
  for (let u of users) {
    console.log("User in query:", {
      id: u._id,
      phone: u.phone,
      fcmToken: u.fcmToken,
      expoPushToken: u.expoPushToken
    });

    const freshUser = await User.findById(u._id);
    console.log("User by FindById:", {
      id: freshUser._id,
      phone: freshUser.phone,
      fcmToken: freshUser.fcmToken,
      expoPushToken: freshUser.expoPushToken
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
