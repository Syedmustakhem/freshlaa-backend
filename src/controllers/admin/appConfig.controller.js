const AppConfig = require("../../models/AppConfig");
const User = require("../../models/User");
const { notifyUser } = require("../../services/notification.service");

exports.getAppConfig = async (req, res) => {
  try {
    let config = await AppConfig.findOne().lean();
    if (!config) {
      // Return defaults if not found
      return res.json({
        success: true,
        data: {
          min_version_android: "1.8.0",
          latest_version_android: "1.8.0",
          min_version_ios: "1.0.0",
          force_update_message: "A new version of FreshLaa is available with important improvements.",
          maintenance_mode: false,
          maintenance_message: "FreshLaa is currently under maintenance. Please try again later.",
          splash: {
            type: "image",
            lottie_url: "https://assets10.lottiefiles.com/packages/lf20_xlmz9xwm.json",
            image_url: "https://res.cloudinary.com/dxiujfq7i/image/upload/v1778394012/Freshlaa_Mother_s_Day_splash_screen_202605101149_qzvd43.jpg",
            duration_ms: 1500,
          },
        }
      });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    console.error("GET APP CONFIG ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch app config" });
  }
};

exports.updateAppConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    // Extract our special notify flag and remove it from updates
    const notifyDeliveryTimingChange = updates.notifyDeliveryTimingChange;
    delete updates.notifyDeliveryTimingChange;

    // Remove internal fields that shouldn't be updated manually
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.updatedAt;

    let config = await AppConfig.findOne();
    
    if (!config) {
      config = new AppConfig(updates);
    } else {
      Object.assign(config, updates);
    }
    
    await config.save();

    // Asynchronously send push notifications if requested
    if (notifyDeliveryTimingChange) {
      sendDeliveryTimingNotifications(config.deliveryTiming?.baseEtaRange || "30-40 mins")
        .catch(err => console.error("Error sending delivery timing notifications:", err));
    }

    res.json({ success: true, message: "App config updated successfully", data: config });
  } catch (err) {
    console.error("UPDATE APP CONFIG ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to update app config" });
  }
};

async function sendDeliveryTimingNotifications(baseEtaRange) {
  console.log("📢 Kicking off FCM delivery timing update notifications to all active users...");
  try {
    const users = await User.find({
      isBlocked: false,
      $or: [
        { fcmToken: { $exists: true, $ne: null, $ne: "" } },
        { expoPushToken: { $exists: true, $ne: null, $ne: "" } }
      ]
    }).select("_id fcmToken expoPushToken");

    console.log(`👥 Found ${users.length} active users with valid push tokens.`);
    if (users.length === 0) return;

    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(`📤 Dispatching batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(users.length / batchSize)} (${batch.length} users)...`);
      await Promise.all(
        batch.map(user => 
          notifyUser({
            userId: user._id,
            type: "MARKETING",
            pushData: {
              title: "Super-Fast Delivery Update! ⚡",
              body: `We are now delivering fresh groceries to you in just ${baseEtaRange}! Order your favorites now.`,
              data: { screen: "Home" }
            }
          }).catch(e => console.error(`❌ Timing notification failed for user ${user._id}:`, e.message))
        )
      );
    }
    console.log("✅ Finished dispatching all timing notifications.");
  } catch (err) {
    console.error("❌ sendDeliveryTimingNotifications error:", err.message);
  }
}
