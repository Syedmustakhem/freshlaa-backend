const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const AppConfig = require("../src/models/AppConfig");
const { notifyUser } = require("../src/services/notification.service");

async function run() {
  console.log("Connecting to DB...");
  await connectDB();
  console.log("Connected successfully!");

  const config = await AppConfig.findOne();
  console.log("AppConfig deliveryTiming:", JSON.stringify(config?.deliveryTiming, null, 2));

  const users = await User.find({
    isBlocked: false,
    $or: [
      { fcmToken: { $type: "string", $ne: "" } },
      { expoPushToken: { $type: "string", $ne: "" } }
    ]
  }).limit(5).select("_id fcmToken expoPushToken name phone");

  console.log(`Found ${users.length} active users with valid push tokens.`);
  users.forEach((u, i) => {
    console.log(`User ${i+1}: ID=${u._id}, Name=${u.name || "N/A"}, Phone=${u.phone}, FCM=${u.fcmToken ? "YES" : "NO"}, Expo=${u.expoPushToken ? "YES" : "NO"}`);
  });

  if (users.length > 0) {
    const testUser = users[0];
    console.log(`Sending test timing notification to user ${testUser._id} (${testUser.phone})...`);
    try {
      await notifyUser({
        userId: testUser._id,
        type: "MARKETING",
        pushData: {
          title: "Super-Fast Delivery Update! ⚡",
          body: `We are now delivering fresh groceries to you in just ${config?.deliveryTiming?.baseEtaRange || "30-40 mins"}! Order your favorites now.`,
          data: { screen: "Home" }
        }
      });
      console.log("Test notification send call executed.");
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  } else {
    console.log("⚠️ No active users found with push tokens.");
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
