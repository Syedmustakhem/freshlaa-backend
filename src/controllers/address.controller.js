const Address = require("../models/Address");

/* ➕ Add Address */
exports.addAddress = async (req, res) => {
  try {
    const address = await Address.create({
      ...req.body,
      userId: req.user.id,
    });

    res.json(address);
  } catch (err) {
    res.status(500).json({ message: "Failed to add address" });
  }
};

/* 📄 Get User Addresses */
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

/* ❌ Delete Address */
exports.deleteAddress = async (req, res) => {
  try {
    await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};