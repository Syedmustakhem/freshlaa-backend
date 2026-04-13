const express = require("express");
const router = express.Router();
const ServiceableArea = require("../models/ServiceableArea");
const adminAuth = require("../middlewares/adminAuth");

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: Check if a pincode is serviceable
// ═════════════════════════════════════════════════════════════════════════════
router.get("/check/:pincode", async (req, res) => {
  try {
    const { pincode } = req.params;
    const area = await ServiceableArea.findOne({ pincode, isActive: true });
    
    if (area) {
      return res.json({ 
        success: true, 
        serviceable: true, 
        message: "Delivery available in your area! 🛵" 
      });
    } else {
      return res.json({ 
        success: true, 
        serviceable: false, 
        message: "We are not serviceable here yet, coming soon! 📦" 
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN: Manage Serviceable Areas
// ═════════════════════════════════════════════════════════════════════════════

// List all
router.get("/admin/all", adminAuth, async (req, res) => {
  try {
    const areas = await ServiceableArea.find().sort({ pincode: 1 });
    return res.json({ success: true, areas });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch areas" });
  }
});

// Add / Update
router.post("/admin/save", adminAuth, async (req, res) => {
  try {
    const { pincode, areaName, isActive, notes } = req.body;
    if (!pincode) return res.status(400).json({ success: false, message: "Pincode is required" });

    const area = await ServiceableArea.findOneAndUpdate(
      { pincode },
      { pincode, areaName, isActive, notes },
      { upsert: true, new: true }
    );

    return res.json({ success: true, area });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to save area" });
  }
});

// Delete
router.delete("/admin/:pincode", adminAuth, async (req, res) => {
  try {
    const result = await ServiceableArea.findOneAndDelete({ pincode: req.params.pincode });
    if (!result) return res.status(404).json({ success: false, message: "Pincode not found" });
    return res.json({ success: true, message: "Pincode removed successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete area" });
  }
});

module.exports = router;
