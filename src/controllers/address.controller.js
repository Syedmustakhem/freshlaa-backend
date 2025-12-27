const Address = require("../models/Address");

/* ✅ ADD ADDRESS */
exports.addAddress = async (req, res) => {
  try {
    const address = await Address.create({
      user: req.user._id, // coming from auth middleware
      ...req.body,
    });

    res.status(201).json({
      success: true,
      address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};

/* ✅ GET USER ADDRESSES */
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
};

/* ✅ DELETE ADDRESS */
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      message: "Address deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};
