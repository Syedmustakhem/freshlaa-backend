const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const HotelMenuItem = require("../models/HotelMenuItem");

const {
  getHotelMenu,
  addHotelMenuItem,
  updateHotelMenuItem,
  disableHotelMenuItem,
  getSimilarItems,
  getRecentlyOrdered,
  incrementViewCount,
} = require("../controllers/hotelMenu.controller");

/* ================= APP ================= */
router.get("/", getHotelMenu);

/* ================= ADMIN ================= */
router.get("/admin/:hotelId", async (req, res) => {
  try {
    const { hotelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotelId",
      });
    }

    const items = await HotelMenuItem.find({ hotelId })
      .sort({ createdAt: -1 })
      .lean();

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
});

router.post("/", addHotelMenuItem);
router.put("/:id", updateHotelMenuItem);
router.delete("/:id", disableHotelMenuItem);
router.get("/similar/:itemId", getSimilarItems);
router.get("/recently-ordered", getRecentlyOrdered);
router.post("/view/:itemId", incrementViewCount);

module.exports = router;
