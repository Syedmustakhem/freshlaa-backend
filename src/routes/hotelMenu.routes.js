const express = require("express");
const HotelMenuItem = require("../models/HotelMenuItem");

const router = express.Router();

/* 🍽️ GET HOTEL MENU */
router.get("/", async (req, res) => {
  try {
    const { hotelId, categoryKey } = req.query;
    const now = new Date();

    const items = await HotelMenuItem.find({
      hotelId,
      categoryKey,
      isAvailable: true,
      $or: [
        { outOfStockUntil: null },
        { outOfStockUntil: { $lte: now } },
      ],
    });

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ➕ ADD HOTEL MENU ITEM */
router.post("/", async (req, res) => {
  try {
    const item = await HotelMenuItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
