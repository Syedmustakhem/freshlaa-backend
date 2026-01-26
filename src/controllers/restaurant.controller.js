const Restaurant = require("../models/Restaurant");

/* ➕ ADD RESTAURANT */
const addRestaurant = async (req, res) => {
  try {
    const { name, image, address, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name and categoryId are required",
      });
    }

    const restaurant = await Restaurant.create({
      name,
      image,
      address,
      categoryId,
    });

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

/* 📥 GET RESTAURANTS (ALL or CATEGORY-WISE) */
const getRestaurants = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const filter = categoryId ? { categoryId } : {};

    const restaurants = await Restaurant.find(filter)
      .populate("categoryId", "name") // ✅ FIXED
      .sort({ createdAt: -1 });

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

/* 🔄 UPDATE RESTAURANT CATEGORY */
const updateRestaurantCategory = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId is required",
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { categoryId },
      { new: true }
    ).populate("categoryId", "name");

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.json({
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

module.exports = {
  addRestaurant,
  getRestaurants,
  toggleRestaurantStatus,
  updateRestaurantCategory,
};
