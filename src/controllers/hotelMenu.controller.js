const HotelMenuItem = require("../models/HotelMenuItem");
const Restaurant = require("../models/Restaurant");

/* ➕ ADD HOTEL MENU ITEM */
const addHotelMenuItem = async (req, res) => {
  try {
    const item = await HotelMenuItem.create(req.body);

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (err) {
    console.error("Add Hotel Menu Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* 📥 GET HOTEL MENU (USED BY APP) */
const getHotelMenu = async (req, res) => {
  try {
    const { hotelId, categoryKey } = req.query;

    if (!hotelId || !categoryKey) {
      return res.status(400).json({
        success: false,
        message: "hotelId and categoryKey are required",
      });
    }

    /* 🔥 STEP 1: CHECK RESTAURANT STATUS */
    const restaurant = await Restaurant.findById(hotelId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (!restaurant.isOpen) {
      return res.json({
        success: true,
        restaurantClosed: true,
        message: "Restaurant is currently closed",
        data: [],
      });
    }

    /* 🔥 STEP 2: FETCH MENU ONLY IF OPEN */
    const items = await HotelMenuItem.find({
      hotelId,
      categoryKey,
      isAvailable: true,
      $or: [
        { outOfStockUntil: null },
        { outOfStockUntil: { $lte: new Date() } },
      ],
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      restaurantClosed: false,
      data: items,
    });
  } catch (err) {
    console.error("Get Hotel Menu Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


module.exports = {
  addHotelMenuItem,
  getHotelMenu,
};
