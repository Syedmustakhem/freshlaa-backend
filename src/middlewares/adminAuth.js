const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Admin token missing" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET
    );

    // ✅ FETCH ADMIN FROM DB
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    // ✅ IMPORTANT: attach full admin object
    req.admin = admin;

    next();
  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err.message);
    return res.status(401).json({ message: "Invalid admin token" });
  }
};