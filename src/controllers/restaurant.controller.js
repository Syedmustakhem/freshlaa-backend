const Restaurant = require("../models/Restaurant");

/* ➕ ADD RESTAURANT */
const addRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* 📥 GET ALL RESTAURANTS */
const getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: restaurants,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* 🔁 TOGGLE OPEN / CLOSE */
const toggleRestaurantStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();

    res.json({
      success: true,
      isOpen: restaurant.isOpen,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ✅ EXPORTS (ONLY THIS WAY) */
module.exports = {
  addRestaurant,
  getRestaurants,
  toggleRestaurantStatus,
};
