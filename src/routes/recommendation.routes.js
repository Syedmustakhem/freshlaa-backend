const express = require("express");
const router = express.Router();
const {
  getStillLooking,
  getSuggested,
  getAlsoBought
} = require("../controllers/recommendation.controller");

router.get("/still-looking/:userId", getStillLooking);
router.get("/suggested/:userId", getSuggested);
router.get("/also-bought/:userId", getAlsoBought); // ✅ ADD THIS

module.exports = router;