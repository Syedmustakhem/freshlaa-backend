const Admin = require("../../models/Admin");
const bcrypt = require("bcryptjs");

exports.createInitialAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // prevent duplicate admin
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      isActive: true,
    });

    res.json({
      success: true,
      message: "Initial admin created",
      admin: {
        id: admin._id,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error("INIT ADMIN ERROR:", err);
    res.status(500).json({ message: "Failed to create admin" });
  }
};
