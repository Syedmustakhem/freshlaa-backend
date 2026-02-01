const express = require("express");
const router = express.Router();

const {
  getHotelMenu,
  addHotelMenuItem,
  updateHotelMenuItem,
  disableHotelMenuItem,
} = require("../controllers/hotelMenu.controller");

/* APP */
router.get("/", getHotelMenu);

/* ADMIN */
router.get("/admin/:hotelId", async (req, res) => {
  try {
    const items = await require("../models/HotelMenuItem").find({
      hotelId: req.params.hotelId,
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
});

router.post("/", addHotelMenuItem);
router.put("/:id", updateHotelMenuItem);
router.delete("/:id", disableHotelMenuItem);

module.exports = router;
