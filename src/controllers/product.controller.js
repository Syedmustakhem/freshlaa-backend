const Product = require("../models/Product");

/* ✅ CREATE MANUAL PRODUCT (ADMIN) */
exports.createManualProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      source: "manual",
      allowShopifySync: false,
    });

    res.status(201).json({
      success: true,
      product,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create manual product" });
  }
};

/* ✅ GET ALL PRODUCTS (optional pagination) */
exports.getAllProducts = async (req, res) => {
  try {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    let query = Product.find();

    if (page && limit) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const products = await query.sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ✅ GET SINGLE PRODUCT */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* ⭐ FEATURED */
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true }).limit(10);
    res.json(products);
  } catch {
    res.status(500).json({ message: "Failed to fetch featured products" });
  }
};

/* 🔥 TRENDING */
exports.getTrendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ isTrending: true }).limit(10);
    res.json(products);
  } catch {
    res.status(500).json({ message: "Failed to fetch trending products" });
  }
};

/* 💸 OFFERS */
exports.getOfferProducts = async (req, res) => {
  try {
    const products = await Product.find({
      offerPercentage: { $gt: 0 },
    }).sort({ offerPercentage: -1 });

    res.json(products);
  } catch {
    res.status(500).json({ message: "Failed to fetch offers" });
  }
};

/* 🔍 SEARCH */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Search query missing" });

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    });

    res.json(products);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
};

/* 🗂 CATEGORY */
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({
      category: { $regex: `^${category}$`, $options: "i" },
    });

    res.json(products);
  } catch {
    res.status(500).json({ message: "Category fetch failed" });
  }
};
