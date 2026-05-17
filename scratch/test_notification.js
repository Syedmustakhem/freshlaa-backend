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
  }).select("_id fcmToken expoPushToken name phone");

  console.log(`Found ${users.length} active users with valid push tokens in DB.`);
  if (users.length === 0) return;

  const sentTokens = new Set();
  const uniqueUsers = [];
  
  for (const user of users) {
    const fcm = user.fcmToken;
    const expo = user.expoPushToken;
    
    let isDuplicate = false;
    if (fcm && sentTokens.has(fcm)) isDuplicate = true;
    if (expo && sentTokens.has(expo)) isDuplicate = true;
    
    if (!isDuplicate) {
      if (fcm) sentTokens.add(fcm);
      if (expo) sentTokens.add(expo);
      uniqueUsers.push(user);
    }
  }

  console.log(`Filtered to ${uniqueUsers.length} unique devices/tokens.`);

  if (uniqueUsers.length > 0) {
    const testUser = uniqueUsers[0];
    console.log(`Sending test timing notification to user ${testUser._id} (${testUser.phone})...`);
    try {
      await notifyUser({
        userId: testUser._id,
        type: "MARKETING",
        pushData: {
          title: `Delivered in just ${config?.deliveryTiming?.baseEtaRange || "30-40 mins"}! ⚡`,
          body: `We've updated our delivery timings. Order fresh groceries and get them in ${config?.deliveryTiming?.baseEtaRange || "30-40 mins"} now!`,
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
