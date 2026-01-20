const express = require("express");
const router = express.Router();

const { adminLogin } = require("../controllers/admin/Adminauth.controller");
const { createInitialAdmin } = require("../controllers/admin/initAdmin.controller");

/* TEMP – USE ONCE */
router.post("/init", createInitialAdmin);

/* LOGIN */
router.post("/login", adminLogin);

module.exports = router;
