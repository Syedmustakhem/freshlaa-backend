const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* ---------------- JWT PROTECT ---------------- */
const protect = async (req, res, next) => {
  try {
    let token;

    // 🔐 Expect: Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // 🔑 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👤 Attach user
    const user = await User.findById(decoded.id).select("-__v");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user; // ✅ attach full user (BEST PRACTICE)

    next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = protect;