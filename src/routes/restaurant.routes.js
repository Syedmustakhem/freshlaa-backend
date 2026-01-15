const express = require("express");
const router = express.Router();

const {
  addRestaurant,
  getRestaurants,
  toggleRestaurantStatus,
} = require("../controllers/restaurant.controller");

router.post("/", addRestaurant);
router.get("/", getRestaurants);
router.patch("/:id/toggle", toggleRestaurantStatus);

module.exports = router;
