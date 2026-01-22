const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Product = require("../models/Product");

/* ================= PUBLIC (APP) ================= */
// 👉 Only ACTIVE categories for app users
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

/* ================= ADMIN ================= */

// 👉 Admin: get ALL categories (active + inactive)
router.get("/admin/all", async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ order: 1 })
      .lean();

    // add product count
    const withCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat.slug,
          isDeleted: { $ne: true },
        });
        return { ...cat, productCount: count };
      })
    );

    res.json(withCount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// 👉 Admin: add category
router.post("/", async (req, res) => {
  try {
    const { name, slug, images, more, type = "shop_by_category" } = req.body;

    if (!name || !images || images.length !== 4) {
      return res
        .status(400)
        .json({ message: "Name and exactly 4 images required" });
    }

    const category = await Category.create({
      name,
      slug,
      images,
      more,
      type,
      isActive: true,
    });

    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add category" });
  }
});

// 👉 Admin: update category (enable / disable / edit)
router.put("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 🔥 auto-hide products if category disabled
    if (req.body.isActive === false) {
      await Product.updateMany(
        { category: category.slug },
        { isActive: false }
      );
    }

    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update category" });
  }
});

module.exports = router;
