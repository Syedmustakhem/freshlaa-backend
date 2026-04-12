/**
 * price_alert.controller.js
 * CRUD operations for price alerts.
 *
 * COPY THIS FILE → your backend: controllers/price_alert.controller.js
 */
const PriceAlert = require("../models/PriceAlert");
const Product = require("../models/Product");
/* ─────────────────────────────────────────────
   POST /api/price-alerts
   Body: { productId }
   Auth: required
───────────────────────────────────────────── */
exports.addAlert = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, message: "productId is required" });
        }
        // Get current product price
        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const currentPrice = product.variants?.[0]?.price || product.price || 0;
        // Upsert — reactivate if it was previously removed
        const alert = await PriceAlert.findOneAndUpdate(
            { user: userId, product: productId },
            {
                trackedPrice: currentPrice,
                isActive: true,
                lastNotifiedAt: null,
                lastNotifiedPrice: null,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return res.status(201).json({
            success: true,
            alert,
            message: `Tracking "${product.name}" at ₹${currentPrice}`,
        });
    } catch (err) {
        if (err.code === 11000) {
            // Already tracking — just reactivate
            const alert = await PriceAlert.findOneAndUpdate(
                { user: req.user._id, product: req.body.productId },
                { isActive: true },
                { new: true }
            );
            return res.json({ success: true, alert, message: "Already tracking" });
        }
        console.error("addAlert error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
/* ─────────────────────────────────────────────
   DELETE /api/price-alerts/:productId
   Auth: required
───────────────────────────────────────────── */
exports.removeAlert = async (req, res) => {
    try {
        const userId = req.user._id;
        const productId = req.params.productId;
        await PriceAlert.findOneAndUpdate(
            { user: userId, product: productId },
            { isActive: false }
        );
        return res.json({ success: true, message: "Alert removed" });
    } catch (err) {
        console.error("removeAlert error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
/* ─────────────────────────────────────────────
   GET /api/price-alerts/mine
   Auth: required
───────────────────────────────────────────── */
exports.getMyAlerts = async (req, res) => {
    try {
        const userId = req.user._id;
        const alerts = await PriceAlert.find({ user: userId, isActive: true })
            .populate("product", "name images image price mrp variants category brand")
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, alerts });
    } catch (err) {
        console.error("getMyAlerts error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
/* ─────────────────────────────────────────────
   GET /api/price-alerts/check/:productId
   Auth: required
───────────────────────────────────────────── */
exports.checkAlert = async (req, res) => {
    try {
        const userId = req.user._id;
        const productId = req.params.productId;
        const alert = await PriceAlert.findOne({
            user: userId,
            product: productId,
            isActive: true,
        }).lean();
        return res.json({
            success: true,
            isTracking: !!alert,
            alert: alert || null,
        });
    } catch (err) {
        console.error("checkAlert error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};