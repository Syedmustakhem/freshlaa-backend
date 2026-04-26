const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Admin token missing" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    let isAdmin = false;

    // 1️⃣ TRY ADMIN TOKEN (Primary)
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      const admin = await Admin.findById(decoded.id);
      if (admin) {
        req.admin = admin;
        isAdmin = true;
      }
    } catch (adminErr) {
      // 2️⃣ TRY USER TOKEN (Fallback for mobile app admins)
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.isAdmin) {
          req.user = user;
          isAdmin = true;
        }
      } catch (userErr) {
        // Both failed
      }
    }

    if (!isAdmin) {
      return res.status(401).json({ message: "Not authorized as admin" });
    }

    next();
  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err.message);
    return res.status(401).json({ message: "Invalid admin token" });
  }
};