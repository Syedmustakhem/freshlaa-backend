// src/middlewares/riderAuth.js
const jwt   = require("jsonwebtoken");
const Rider = require("../models/Rider");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ success: false, message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "rider")
      return res.status(403).json({ success: false, message: "Not a rider token" });

    const rider = await Rider.findById(decoded.id).select("-password");
    if (!rider || !rider.isActive)
      return res.status(401).json({ success: false, message: "Rider not found or inactive" });

    req.rider = rider;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};