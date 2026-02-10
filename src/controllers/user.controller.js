const User = require("../models/User");

/* GET PROFILE */
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        phone: req.user.phone,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to get profile" });
  }
};

/* UPDATE PROFILE */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    await user.save();

    res.json({
      success: true,
      user: {
        phone: user.phone,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Profile update failed" });
  }
};
exports.getLoyaltyPoints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      loyaltyPoints: user.loyaltyPoints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* SAVE EXPO PUSH TOKEN */
exports.savePushToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.json({ success: true });
    }

    await User.findByIdAndUpdate(req.user._id, {
      expoPushToken,
      lastLogin: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Save push token error:", err);
    res.status(500).json({ message: "Failed to save push token" });
  }
};
