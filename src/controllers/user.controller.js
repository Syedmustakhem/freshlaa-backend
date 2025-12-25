const User = require("../models/User");

/* GET PROFILE */
exports.getProfile = async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      createdAt: req.user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to get profile" });
  }
};

/* UPDATE PROFILE */
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name || user.name;
    await user.save();

    res.json({
      message: "Profile updated",
      name: user.name,
    });
  } catch (err) {
    res.status(500).json({ message: "Profile update failed" });
  }
};