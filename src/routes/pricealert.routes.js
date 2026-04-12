/**
 * price_alert.routes.js
 */
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/pricealert.controller");
const { checkPriceDrops } = require("../crons/price_alert.cron");

// All routes require authentication
router.use(auth);
router.post("/", ctrl.addAlert);
router.get("/mine", ctrl.getMyAlerts);
router.get("/check/:productId", ctrl.checkAlert);
router.delete("/:productId", ctrl.removeAlert);

// ✅ Manual trigger — test price drop notifications instantly
// POST /api/price-alerts/trigger-check
router.post("/trigger-check", async (req, res) => {
  try {
    console.log("🔔 Manual price drop check triggered by user:", req.user._id);
    await checkPriceDrops();
    res.json({ success: true, message: "Price drop check completed" });
  } catch (err) {
    console.error("Manual trigger error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
