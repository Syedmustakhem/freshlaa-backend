const express = require("express");
const router = express.Router();

const { adminLogin } = require("../controllers/admin/Adminauth.controller");
const { createInitialAdmin } = require("../controllers/admin/initAdmin.controller");
const { getDashboardMetrics } = require("../controllers/admin/dashboard.controller");
const { updateOrderStatus } = require("../controllers/order.controller");
const Category = require("../models/Category");
const CategorySection = require("../models/CategorySection");

const adminAuth = require("../middlewares/adminAuth");
const User = require("../models/User");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");

/* ================= ADMIN SETUP ================= */

/* TEMP – USE ONCE */
router.post("/init", createInitialAdmin);

/* LOGIN */
router.post("/login", adminLogin);
router.get("/dashboard", adminAuth, getDashboardMetrics);
/**
 * PATCH /api/admin/orders/status
 * Update order status + push notification
 */
router.patch("/orders/status", adminAuth, updateOrderStatus);

/* ================= USERS (ADMIN PANEL) ================= */
/**
 * GET /api/admin/users/:id
 * User profile details
 */
router.get("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -otp")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("ADMIN USER DETAILS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load user details",
    });
  }
});
/**
 * PATCH /api/admin/users/:id/status
 * Block / Unblock user
 */
router.patch("/users/:id/status", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

user.isBlocked = !user.isBlocked;
    await user.save();

  res.json({
  success: true,
  message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
  data: {
    isBlocked: user.isBlocked,
  },
});

  } catch (err) {
    console.error("USER STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
});
/**
 * GET /api/admin/users/:id/addresses
 */
router.get("/users/:id/addresses", adminAuth, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.params.id }).lean();

    res.json({
      success: true,
      data: addresses,
    });
  } catch (err) {
    console.error("ADMIN USER ADDRESSES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load addresses",
    });
  }
});

/**
 * GET /api/admin/users/:id/orders
 */
router.get("/users/:id/orders", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    console.error("ADMIN USER ORDERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load orders",
    });
  }
});

/**
 * GET /api/admin/users/:id/cart
 */
router.get("/users/:id/cart", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("cart.productId")
      .lean();

    res.json({
      success: true,
      data: user?.cart || [],
    });
  } catch (err) {
    console.error("ADMIN USER CART ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load cart",
    });
  }
});
/**
 * GET /api/admin/orders
 * Get all orders (global)
 */
router.get("/orders", adminAuth, async (req, res) => {
  try {

    const orders = await Order.find()
      .populate("user", "name phone")
      .sort({ createdAt: -1 })
      .lean();


    const formattedOrders = await Promise.all(

      orders.map(async (order) => ({

        ...order,

        items: await Promise.all(

          (order.items || []).map(async (i) => {

            // ✅ If already has name & image
            if (i.name && i.image) {

              return i;

            }

            // ✅ Fetch from Product table (OLD ORDERS)

            if (i.product) {

              const product = await Product.findById(i.product)
              .select("name image")
              .lean();

              return {

                name: product?.name || "Product",

                image: product?.image || "",

                qty: i.qty,

                price: i.price

              };

            }

            return {

              name: "Product",

              image: "",

              qty: i.qty,

              price: i.price

            };

          })

        )

      }))

    );


    res.json({

      success:true,

      data:formattedOrders

    });

  }
  catch(err){

    console.error("ADMIN GLOBAL ORDERS ERROR:",err);

    res.status(500).json({

      success:false,

      message:"Failed to load orders"

    });

  }
});
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { search = "", status } = req.query;

    const query = {};

    // Search by name / phone / email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status === "active") query.isActive = true;
    if (status === "blocked") query.isActive = false;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password -otp")
      .lean();

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});
/**
 * GET /api/admin/categories
 * Get all categories for admin panel
 */
/**
 * GET /api/admin/categories
 * Optional: ?sectionId=xxxx
 */
router.get("/categories", adminAuth, async (req, res) => {
  try {
    const { sectionId, displayType } = req.query;

    const query = {};

    if (sectionId) {
      query.sectionId = sectionId;
    }

    if (displayType) {
      query.displayType = displayType;
    }

    const categories = await Category.find(query)
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load categories",
    });
  }
});

/**
 * GET /api/admin/category-sections
 * Used in Product Add/Edit form
 */
router.get("/category-sections", adminAuth, async (req, res) => {
  try {
    const sections = await CategorySection.find()
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: sections,
    });
  } catch (err) {
    console.error("ADMIN CATEGORY SECTIONS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load category sections",
    });
  }
});
router.patch("/categories/:slug/image", adminAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    const updated = await Category.findOneAndUpdate(
      { slug },
      { $set: { image } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE CATEGORY IMAGE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update category image",
    });
  }
});
router.patch("/categories/:slug/images", adminAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { images } = req.body; // array of image URLs

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Images array is required",
      });
    }

    const updated = await Category.findOneAndUpdate(
      { slug },
      { $set: { images } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE CATEGORY IMAGES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update category images",
    });
  }
});
router.post("/categories", adminAuth, async (req, res) => {
  try {
    const { title, slug, images, isActive } = req.body;

    if (!title || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title and slug are required",
      });
    }

    const exists = await Category.findOne({ slug });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists",
      });
    }

    const category = await Category.create({
      title,
      slug,
      images: images || [],
      isActive: isActive ?? true,
    });

    res.json({
      success: true,
      data: category,
    });

  } catch (err) {
    console.error("ADMIN CREATE CATEGORY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
});

// UPDATE CATEGORY
router.put("/categories/:id", adminAuth, async (req, res) => {
  const { title, slug, isActive } = req.body;

  const updated = await Category.findByIdAndUpdate(
    req.params.id,
    { title, slug, isActive },
    { new: true }
  );

  res.json({ success: true, data: updated });
});

// TOGGLE STATUS
router.patch("/categories/:id/status", adminAuth, async (req, res) => {
  const cat = await Category.findById(req.params.id);
  cat.isActive = !cat.isActive;
  await cat.save();
  res.json({ success: true });
});

// DELETE
router.delete("/categories/:id", adminAuth, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
router.put("/coupons/:id", adminAuth, async (req, res) => {
  try {
    const updated = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});
router.post("/coupons", adminAuth, async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      expiryDate,
      isActive,
    } = req.body;

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      expiryDate,
      isActive,
    });

    res.json({ success: true, data: coupon });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});
router.get("/coupons", adminAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (err) {
    console.error("ADMIN COUPONS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load coupons",
    });
  }
});
router.patch("/coupons/:id/status", adminAuth, async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({ success: false });
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  res.json({ success: true });
});
module.exports = router;
