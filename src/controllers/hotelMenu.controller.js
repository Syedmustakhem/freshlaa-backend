const mongoose = require("mongoose");
const HotelMenuItem = require("../models/HotelMenuItem");
const Restaurant = require("../models/Restaurant");

/* 📥 GET HOTEL MENU (APP) */
const getHotelMenu = async (req, res) => {
  try {
    const { hotelId, categoryKey, foodType, availableOnly } = req.query;

    /* ================= VALIDATION ================= */
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
        filters: [],
      });
    }

    /* ================= BASE FILTER ================= */
    const now = new Date();

    const filter = {
      hotelId,
      isAvailable: true,
      $or: [
        { outOfStockUntil: null },
        { outOfStockUntil: { $lte: now } },
      ],
    };

    /* ================= APPLY QUERY FILTERS ================= */
    if (categoryKey) filter.categoryKey = categoryKey;
    if (foodType === "VEG") filter.foodType = "VEG";
    if (foodType === "NON_VEG") filter.foodType = "NON_VEG";

    if (availableOnly === "true") {
      const time = now.toTimeString().slice(0, 5);
      filter.$and = [
        {
          $or: [
            { availableFrom: null },
            { availableTo: null },
            {
              availableFrom: { $lte: time },
              availableTo: { $gte: time },
            },
          ],
        },
      ];
    }

    /* ================= FETCH MENU ================= */
    const items = await HotelMenuItem.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    /* ================= BUILD FILTER CHIPS ================= */
    const filters = [{ key: "ALL", label: "All" }];

    const hasVeg = await HotelMenuItem.exists({ hotelId, foodType: "VEG" });
    const hasNonVeg = await HotelMenuItem.exists({ hotelId, foodType: "NON_VEG" });

    if (hasVeg) filters.push({ key: "VEG", label: "🟢 Veg" });
    if (hasNonVeg) filters.push({ key: "NON_VEG", label: "🔴 Non-Veg" });

    filters.push({ key: "AVAILABLE", label: "⚡ Available Now" });

    const categories = await HotelMenuItem.distinct("categoryKey", { hotelId });
    categories.forEach((cat) => {
      filters.push({
        key: `CATEGORY:${cat}`,
        label: cat.replace(/-/g, " "),
      });
    });

    /* ================= RESPONSE ================= */
    res.json({
      success: true,
      restaurantClosed: false,
      data: items,
      filters,
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
