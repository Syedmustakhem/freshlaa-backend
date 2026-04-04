const express = require("express");
const router = express.Router();
const {
  saveSearch,
  saveView
} = require("../controllers/activity.controller");

router.post("/search", saveSearch);
router.post("/view", saveView);

module.exports = router;