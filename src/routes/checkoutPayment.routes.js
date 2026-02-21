const express = require("express");
const router = express.Router();
const { getCheckoutConfig } = require("../controllers/checkoutPayment.controller");
const auth = require("../middleware/auth");

router.get("/config", auth, getCheckoutConfig);

module.exports = router;