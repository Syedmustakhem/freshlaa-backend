import HotelMenuItem from "../models/HotelMenuItem.js";

/* ➕ ADD HOTEL MENU ITEM */
export const addHotelMenuItem = async (req, res) => {
  try {
    const item = await HotelMenuItem.create(req.body);

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* 📥 GET HOTEL MENU (USED BY APP) */
export const getHotelMenu = async (req, res) => {
  try {
    const { hotelId, categoryKey } = req.query;

    const items = await HotelMenuItem.find({
      hotelId,
      categoryKey,
      isAvailable: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: items,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
