const mongoose = require("mongoose");
const User = require("../models/User");

/* GET CART */
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: "cart.productId",
        // dynamic ref handled in User model later
      })
      .populate("cart.hotelId");

    res.json(user.cart);
  } catch (err) {
    console.error("GET CART ERROR:", err);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

/* SYNC CART (PRODUCT + HOTEL) */
const syncCart = async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "Invalid cart format" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
const formattedCart = cart
  .map((item) => {
    if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
      console.warn("⚠️ Skipping invalid cart item:", item.productId);
      return null;
    }

    if (!["Product", "HotelMenuItem"].includes(item.itemModel)) {
      console.warn("⚠️ Skipping invalid itemModel:", item.itemModel);
      return null;
    }

    let finalPrice = Number(item.finalPrice) || 0;

    // Safety calc for hotel items
    if (item.itemModel === "HotelMenuItem") {
      finalPrice =
        Number(item.basePrice || 0) +
        Number(item.selectedVariant?.price || 0) +
        (item.selectedAddons || []).reduce(
          (sum, a) => sum + Number(a.price || 0),
          0
        );
    }

    return {
      productId: new mongoose.Types.ObjectId(item.productId),
      itemModel: item.itemModel,
      qty: Number(item.qty) || 1,

      hotelId:
        item.itemModel === "HotelMenuItem" && item.hotelId
          ? new mongoose.Types.ObjectId(item.hotelId)
          : null,

      selectedVariant: item.selectedVariant || null,
      selectedAddons: item.selectedAddons || [],
      finalPrice,
    };
  })
  .filter(Boolean); // ✅ THIS LINE FIXES EVERYTHING


    user.cart = formattedCart;
    await user.save();

    res.json({
      message: "Cart synced successfully",
      cart: user.cart,
    });
  } catch (err) {
    console.error("🔥 CART SYNC ERROR:", err.message);
    res.status(400).json({ message: err.message });
  }
};

/* CLEAR CART */
const clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.cart = [];
    await user.save();

    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear cart" });
  }
};

module.exports = {
  getCart,
  syncCart,
  clearCart,
};
