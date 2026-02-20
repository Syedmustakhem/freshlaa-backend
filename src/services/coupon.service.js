const Coupon = require("../models/Coupon");

exports.applyCoupon = async (subtotal, couponCode) => {
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
    expiryDate: { $gt: new Date() },
  });

  if (!coupon) throw new Error("Invalid or expired coupon");

  if (subtotal < coupon.minOrderAmount) {
    throw new Error(
      `Minimum order ₹${coupon.minOrderAmount} required`
    );
  }

  if (
    coupon.usageLimit !== 0 &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw new Error("Coupon usage limit reached");
  }

  let discount = 0;

  if (coupon.discountType === "FLAT") {
    discount = coupon.discountValue;
  }

  if (coupon.discountType === "PERCENT") {
    discount = (subtotal * coupon.discountValue) / 100;

    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }

  return discount;
};