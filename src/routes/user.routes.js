const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");

const {
  getProfile,
  updateProfile,
} = require("../controllers/user.controller");

/* USER PROFILE */
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;