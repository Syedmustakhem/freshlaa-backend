const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const User = require("../models/User");

router.post("/save-token", auth, async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ message: "Push token missing" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      pushToken,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to save token" });
  }
});

module.exports = router;
