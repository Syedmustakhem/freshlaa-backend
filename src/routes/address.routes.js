const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");

const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/address.controller");

/* GET ALL */
router.get("/", protect, getAddresses);

/* CREATE */
router.post("/", protect, createAddress);

/* UPDATE */
router.put("/:id", protect, updateAddress);

/* DELETE */
router.delete("/:id", protect, deleteAddress);

module.exports = router;
