const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const User = require("../models/User");

/* SAVE PUSH TOKEN */
router.post("/save-token", protect, async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: "Push token required",
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      pushToken,
    });

    res.json({
      success: true,
      message: "Push token saved",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to save push token",
    });
  }
});

module.exports = router;