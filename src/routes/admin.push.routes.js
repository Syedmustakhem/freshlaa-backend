const express = require("express");
const router = express.Router();
const AdminPush = require("../models/AdminPush");

router.post("/subscribe", async (req, res) => {
  await AdminPush.create(req.body);
  res.json({ success: true });
});

module.exports = router;
