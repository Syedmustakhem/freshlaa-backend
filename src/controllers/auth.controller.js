const User = require("../models/User");
exports.login = async (req, res) => {
  try {
    const { firebaseUid, phone, expoPushToken } = req.body;
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        message: "firebaseUid is required",
      });
    }

    // 🔍 2. Find user by trusted UID
    let user = await User.findOne({ firebaseUid });

    // 🆕 3. Create user if first login
    if (!user) {
      user = await User.create({
        firebaseUid,
        phone,
        expoPushToken,
        lastLogin: new Date(),
      });
    } else {
      // 🔄 4. Update login info
      user.phone = phone || user.phone;
      user.expoPushToken = expoPushToken || user.expoPushToken;
      user.lastLogin = new Date();
      await user.save();
    }

    // ✅ 5. Respond success
    return res.json({
      success: true,
      userId: user._id,
    });
  } catch (error) {
    console.error("❌ Auth login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
}
exports.deleteAccount = async (req, res) => {
  try {
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        message: "firebaseUid is required",
      });
    }

    await User.findOneAndDelete({ firebaseUid });

    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete account error:", error);
    return res.status(500).json({
      success: false,
      message: "Account deletion failed",
    });
  }
};
;
