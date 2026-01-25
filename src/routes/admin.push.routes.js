const express = require("express");
const router = express.Router();
const AdminPush = require("../models/AdminPush");

router.post("/subscribe", async (req, res) => {
  try {
    const sub = req.body;

    if (!sub || !sub.endpoint) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    await AdminPush.create({ subscription: sub });
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN SUBSCRIBE ERROR:", err);
    res.status(500).json({ message: "Failed to subscribe" });
  }
});

module.exports = router;
