const express = require("express");
const router = express.Router();

const {
  login,
  deleteAccount,
} = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/delete-account", deleteAccount); // ✅ ADD

module.exports = router;
