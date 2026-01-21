const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

// ✅ GET categories (app + admin)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// ✅ POST category (admin – Cloudinary URLs only)
router.post("/", async (req, res) => {
  try {
    const {
      name,
      slug,
      images,
      more,
      type = "shop_by_category",
      isActive = true,
    } = req.body;

    // basic validation
    if (!name || !images || images.length !== 4) {
      return res
        .status(400)
        .json({ message: "Name and exactly 4 images are required" });
    }

    const category = await Category.create({
      name,
      slug,
      images,
      more,
      type,
      isActive,
    });

    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add category" });
  }
});

module.exports = router;
