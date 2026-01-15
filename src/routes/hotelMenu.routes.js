const express = require("express");
const router = express.Router();

const HotelMenuItem = require("../models/HotelMenuItem");
const Restaurant = require("../models/Restaurant");

/* 🍽️ GET HOTEL MENU (APP USE) */
router.get("/", async (req, res) => {
  try {
    const { hotelId, categoryKey } = req.query;

    if (!hotelId || !categoryKey) {
      return res.status(400).json({
        success: false,
        message: "hotelId and categoryKey are required",
      });
    }

    /* 🔥 CHECK RESTAURANT STATUS */
    const restaurant = await Restaurant.findById(hotelId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    /* 🔴 CLOSED → ZOMATO SHUTTER */
    if (!restaurant.isOpen) {
      return res.json({
        success: true,
        restaurantClosed: true,
        message: "Restaurant is currently closed",
        data: [],
      });
    }

    /* 🟢 OPEN → LOAD MENU */
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
    console.error("Hotel Menu Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ➕ ADD HOTEL MENU ITEM (ADMIN) */
router.post("/", async (req, res) => {
  try {
    const item = await HotelMenuItem.create(req.body);
    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
