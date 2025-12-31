const express = require("express");
const router = express.Router();

const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/address.controller");

const { protect } = require("../middlewares/auth.middleware");

/* ROUTES */
router.get("/", protect, getAddresses);
router.post("/", protect, addAddress);
router.put("/:id", protect, updateAddress);
router.delete("/:id", protect, deleteAddress);

module.exports = router;