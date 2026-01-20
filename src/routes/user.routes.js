const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");

const {
  getProfile,
  updateProfile,
    savePushToken,
} = require("../controllers/user.controller");

/* USER PROFILE */
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
/* SAVE PUSH TOKEN */
router.post("/save-push-token", protect, savePushToken);

module.exports = router;