const mongoose = require("mongoose");
const HotelMenuItem = require("../models/HotelMenuItem");
const Restaurant = require("../models/Restaurant");

/* 📥 GET HOTEL MENU (APP) */
const getHotelMenu = async (req, res) => {
  try {
    const { hotelId, categoryKey } = req.query;

    if (!hotelId || !mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        message: "Valid hotelId is required",
      });
    }

    const restaurant = await Restaurant.findById(hotelId).lean();
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

    const filter = {
      hotelId,
      isAvailable: true,
      $or: [
        { outOfStockUntil: null },
        { outOfStockUntil: { $lte: now } },
      ],
    };

    if (categoryKey) {
      filter.categoryKey = categoryKey;
    }

    const items = await HotelMenuItem.find(filter)
      .sort({ createdAt: -1 })
      .lean();

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
    const { mrp, basePrice } = req.body;

    if (mrp && mrp < basePrice) {
      return res.status(400).json({
        success: false,
        message: "MRP cannot be less than base price",
      });
    }

    const item = await HotelMenuItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ✏️ UPDATE MENU ITEM (ADMIN) */
const updateHotelMenuItem = async (req, res) => {
  try {
    const { mrp, basePrice } = req.body;

    if (mrp && basePrice && mrp < basePrice) {
      return res.status(400).json({
        success: false,
        message: "MRP cannot be less than base price",
      });
    }

    const updated = await HotelMenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ❌ DISABLE MENU ITEM (ADMIN) */
const disableHotelMenuItem = async (req, res) => {
  try {
    const updated = await HotelMenuItem.findByIdAndUpdate(req.params.id, {
      isAvailable: false,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getHotelMenu,
  addHotelMenuItem,
  updateHotelMenuItem,
  disableHotelMenuItem,
};
