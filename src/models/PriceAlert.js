/**
 * PriceAlert.model.js
 * Tracks products users want price drop notifications for.
 * 
 * COPY THIS FILE → your backend: models/PriceAlert.model.js
 */
const mongoose = require("mongoose");
const priceAlertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
    },
    // Price when the user started tracking
    trackedPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    // Is this alert still active?
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    // Last time we sent a notification for this alert
    lastNotifiedAt: {
        type: Date,
        default: null,
    },
    // The price at which we last notified (to avoid duplicate notifications)
    lastNotifiedPrice: {
        type: Number,
        default: null,
    },
}, { timestamps: true });
// Prevent duplicate alerts for same user + product
priceAlertSchema.index({ user: 1, product: 1 }, { unique: true });
module.exports = mongoose.model("PriceAlert", priceAlertSchema);