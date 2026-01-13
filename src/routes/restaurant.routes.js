const express = require("express");
const router = express.Router();

const {
  addRestaurant,
  getRestaurants,
} = require("../controllers/restaurant.controller");

/* ➕ ADD RESTAURANT */
router.post("/", addRestaurant);

/* 📥 GET RESTAURANTS */
router.get("/", getRestaurants);

module.exports = router;
