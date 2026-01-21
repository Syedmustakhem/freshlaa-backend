const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

// GET categories (app + admin)
router.get("/", async (req, res) => {
  const categories = await Category.find({ isActive: true });
  res.json(categories);
});

// POST category (admin)
router.post("/", async (req, res) => {
  try {
    const { name, slug, images, isActive } = req.body;

    const category = await Category.create({
      name,
      slug,
      images,
      isActive,
    });

    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add category" });
  }
});

module.exports = router;
