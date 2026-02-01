const HotelMenuItem = require("../models/HotelMenuItem");
const Restaurant = require("../models/Restaurant");

/* 📥 GET HOTEL MENU (APP) */
const getHotelMenu = async (req, res) => {
  try {
    const { hotelId, categoryKey } = req.query;

    if (!hotelId || !categoryKey) {
      return res.status(400).json({
        success: false,
        message: "hotelId and categoryKey are required",
      });
    }

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
        data: [],
      });
    }

    const now = new Date();

    const items = await HotelMenuItem.find({
      hotelId,
      categoryKey,
      isAvailable: true,
      $or: [
        { outOfStockUntil: null },
        { outOfStockUntil: { $lte: now } },
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

/* ➕ ADD MENU ITEM (ADMIN) */
const addHotelMenuItem = async (req, res) => {
  try {
    const item = await HotelMenuItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ✏️ UPDATE MENU ITEM (ADMIN) */
const updateHotelMenuItem = async (req, res) => {
  const updated = await HotelMenuItem.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json({ success: true, data: updated });
};

/* ❌ DISABLE MENU ITEM (ADMIN) */
const disableHotelMenuItem = async (req, res) => {
  await HotelMenuItem.findByIdAndUpdate(req.params.id, {
    isAvailable: false,
  });
  res.json({ success: true });
};

module.exports = {
  getHotelMenu,
  addHotelMenuItem,
  updateHotelMenuItem,
  disableHotelMenuItem,
};
