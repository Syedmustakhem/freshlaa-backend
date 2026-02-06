const mongoose = require("mongoose");
const HotelMenuItem = require("../models/HotelMenuItem");
const Restaurant = require("../models/Restaurant");
const { MENU_FILTERS } = require("../../constants/menuFilters");

/* =========================================================
   📥 GET HOTEL MENU (APP)
   ========================================================= */
const getHotelMenu = async (req, res) => {
  try {
const { hotelId } = req.query;
const filterKey = req.query.filterKey?.trim();

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

    /* ================= APPLY FILTER KEY ================= */
    if (filterKey && filterKey !== "ALL") {
      // Veg / Non-Veg

      // Bestseller / Recommended
      if (filterKey === "BESTSELLER") filter.isBestseller = true;
      if (filterKey === "RECOMMENDED") filter.isRecommended = true;


      // Category filter
      if (filterKey.startsWith("CATEGORY:")) {
        filter.categoryKey = filterKey.split(":")[1];
      }

      // 🔥 MENU FILTERS
     if (filterKey.startsWith("FILTER:")) {
  const menuFilter = filterKey.split(":")[1];
  if (MENU_FILTERS.includes(menuFilter)) {
    filter.filters = { $exists: true, $in: [menuFilter] };
  }
}

    }

    /* ================= FETCH MENU ================= */
    const items = await HotelMenuItem.find(filter)
      .sort({
        isBestseller: -1,
        isRecommended: -1,
        createdAt: -1,
      })
      .lean();

    /* ================= BUILD FILTER CHIPS ================= */
    const filters = [{ key: "ALL", label: "All" }];

    const hasBestseller = await HotelMenuItem.exists({
      hotelId,
      isBestseller: true,
    });

    const hasRecommended = await HotelMenuItem.exists({
      hotelId,
      isRecommended: true,
    });

    if (hasBestseller)
      filters.push({ key: "BESTSELLER", label: "⭐ Bestseller" });

    if (hasRecommended)
      filters.push({ key: "RECOMMENDED", label: "👍 Recommended" });

    const categories = await HotelMenuItem.distinct("categoryKey", { hotelId });

categories
  .filter(Boolean)
  .forEach((cat) => {
    const key = `CATEGORY:${cat}`;

    if (!filters.some((fl) => fl.key === key)) {
      filters.push({
        key,
        label: cat.replace(/-/g, " "),
      });
    }
  });

    /* ================= MENU FILTER CHIPS ================= */
const menuFilters = await HotelMenuItem.distinct("filters", {
  hotelId,
  filters: { $exists: true, $ne: [] },
});

    menuFilters
      .filter(Boolean)
      .forEach((f) => {
        if (MENU_FILTERS.includes(f)) {
          filters.push({
            key: `FILTER:${f}`,
            label: f.replace(/-/g, " "),
          });
        }
      });

    /* ================= RESPONSE ================= */
    return res.json({
      success: true,
      restaurantClosed: false,
      data: items,
      filters,
    });
  } catch (err) {
    console.error("Get Hotel Menu Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   ➕ ADD MENU ITEM (ADMIN)
   ========================================================= */
const addHotelMenuItem = async (req, res) => {
  try {
    const { mrp, basePrice, filters } = req.body;

    if (mrp && mrp < basePrice) {
      return res.status(400).json({
        success: false,
        message: "MRP cannot be less than base price",
      });
    }

    if (filters) {
      const invalidFilters = filters.filter(
        (f) => !MENU_FILTERS.includes(f)
      );
      if (invalidFilters.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid menu filters: ${invalidFilters.join(", ")}`,
        });
      }
    }

    const item = await HotelMenuItem.create(req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   ✏️ UPDATE MENU ITEM (ADMIN)
   ========================================================= */
const updateHotelMenuItem = async (req, res) => {
  try {
    const { mrp, basePrice, filters } = req.body;

    if (mrp && basePrice && mrp < basePrice) {
      return res.status(400).json({
        success: false,
        message: "MRP cannot be less than base price",
      });
    }

    if (filters) {
      const invalidFilters = filters.filter(
        (f) => !MENU_FILTERS.includes(f)
      );
      if (invalidFilters.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid menu filters: ${invalidFilters.join(", ")}`,
        });
      }
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

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   ❌ DISABLE MENU ITEM (ADMIN)
   ========================================================= */
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

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getHotelMenu,
  addHotelMenuItem,
  updateHotelMenuItem,
  disableHotelMenuItem,
};
