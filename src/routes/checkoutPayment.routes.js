const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const controller = require("../controllers/checkoutPayment.controller");

router.get("/config", protect, controller.getCheckoutConfig);

module.exports = router;