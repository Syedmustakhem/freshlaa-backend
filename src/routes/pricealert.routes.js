/**
 * price_alert.routes.js
 *
 * COPY THIS FILE → your backend: routes/price_alert.routes.js
 *
 * Then register in app.js:
 *   const priceAlertRoutes = require("./routes/price_alert.routes");
 *   app.use("/api/price-alerts", priceAlertRoutes);
 */
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/pricealert.controller");
// All routes require authentication
router.use(auth);
router.post("/", ctrl.addAlert);
router.get("/mine", ctrl.getMyAlerts);
router.get("/check/:productId", ctrl.checkAlert);
router.delete("/:productId", ctrl.removeAlert);
module.exports = router;
