const HotelMenuItem = require("../models/HotelMenuItem");

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
