const Restaurant = require("../models/Restaurant");

/* ➕ ADD RESTAURANT */
const addRestaurant = async (req, res) => {
  try {
    const { name, image, address, categorySlug } = req.body;

    if (!name || !categorySlug) {
      return res.status(400).json({
        success: false,
        message: "name and categorySlug are required",
      });
    }

    const restaurant = await Restaurant.create({
      name,
      image,
      address,
      categorySlug,
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

/* 📥 GET RESTAURANTS (SLUG BASED) */
const getRestaurants = async (req, res) => {
  try {
    const { categorySlug } = req.query;

    const filter = categorySlug ? { categorySlug } : {};

    const restaurants = await Restaurant.find(filter)
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
/* ✏️ UPDATE RESTAURANT */
const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, address, categorySlug, isOpen } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(image && { image }),
        ...(address && { address }),
        ...(categorySlug && { categorySlug }),
        ...(typeof isOpen === "boolean" && { isOpen }),
      },
      { new: true }
    );

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
  updateRestaurant,
  toggleRestaurantStatus,
};
