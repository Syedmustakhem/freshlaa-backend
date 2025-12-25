const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const {
  addAddress,
  getAddresses,
  deleteAddress,
} = require("../controllers/address.controller");

/* Protected routes */
router.post("/", auth, addAddress);
router.get("/", auth, getAddresses);
router.delete("/:id", auth, deleteAddress);

module.exports = router;