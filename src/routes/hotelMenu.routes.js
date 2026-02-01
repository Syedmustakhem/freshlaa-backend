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
router.post("/", addHotelMenuItem);
router.put("/:id", updateHotelMenuItem);
router.delete("/:id", disableHotelMenuItem);

module.exports = router;
