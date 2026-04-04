const express = require("express");
const router = express.Router();
const {
  getStillLooking,
  getSuggested
} = require("../controllers/recommendation.controller");

router.get("/still-looking/:userId", getStillLooking);
router.get("/suggested/:userId", getSuggested);

module.exports = router;