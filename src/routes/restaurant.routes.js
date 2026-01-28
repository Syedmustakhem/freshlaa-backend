const express = require("express");
const router = express.Router();

const {
  addRestaurant,
  getRestaurants,
  toggleRestaurantStatus,
  updateRestaurantCategory,
} = require("../controllers/restaurant.controller");

const adminAuth = require("../middlewares/adminAuth");

// PUBLIC (APP + ADMIN)
router.get("/", getRestaurants);

// ADMIN ONLY
router.post("/", adminAuth, addRestaurant);
router.patch("/:id/toggle", adminAuth, toggleRestaurantStatus);


module.exports = router;
