const Restaurant = require("../models/Restaurant");

/* ➕ ADD RESTAURANT */
const addRestaurant = async (req, res) => {
  try {
    let {
      name,
      image,
      address,
      categorySlug,
      openTime,
      closeTime,
      isOpen,
    } = req.body;

    if (!name || !categorySlug || !openTime || !closeTime) {
      return res.status(400).json({
        success: false,
        message: "name, categorySlug, openTime and closeTime are required",
      });
    }

    // ✅ NORMALIZE
    name = name.trim().toLowerCase();
    categorySlug = categorySlug.trim().toLowerCase();

    const restaurant = await Restaurant.create({
      name,
      image,
      address,
      categorySlug,
      openTime,
      closeTime,
      isOpen: typeof isOpen === "boolean" ? isOpen : true,
    });

    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } catch (err) {
    console.error("ADD RESTAURANT ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* 📥 GET RESTAURANTS */
const getRestaurants = async (req, res) => {
  try {
    const { categorySlug } = req.query;

    const filter = categorySlug
      ? { categorySlug: categorySlug.trim().toLowerCase() }
      : {};

    const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 });

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

    let {
      name,
      image,
      address,
      categorySlug,
      openTime,
      closeTime,
      isOpen,
    } = req.body;

    if (!name || !categorySlug || !openTime || !closeTime) {
      return res.status(400).json({
        success: false,
        message: "name, categorySlug, openTime and closeTime are required",
      });
    }

    // ✅ NORMALIZE
    name = name.trim().toLowerCase();
    categorySlug = categorySlug.trim().toLowerCase();

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      {
        name,
        image,
        address,
        categorySlug,
        openTime,
        closeTime,
        isOpen: typeof isOpen === "boolean" ? isOpen : true,
      },
      { new: true, runValidators: true }
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
