const Coupon = require("../models/Coupon");

exports.applyCoupon = async (code, itemsTotal) => {
  const coupon = await Coupon.findOne({ code, isActive: true });

  if (!coupon) throw new Error("Invalid coupon");

  if (itemsTotal < coupon.minCartValue)
    throw new Error("Minimum cart value not met");

  return coupon.discountAmount;
};