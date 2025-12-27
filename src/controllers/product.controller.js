const Product = require("../models/Product");

/* ✅ GET ALL PRODUCTS */
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ✅ GET PRODUCT BY ID */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* ✅ SEARCH PRODUCTS */
exports.searchProducts = async (req, res) => {
  try {
    const q = req.query.q || "";

    const products = await Product.find({
      isActive: true,
      name: { $regex: q, $options: "i" },
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
};

/* ✅ GET BY CATEGORY */
exports.getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();

    const products = await Product.find({
      category,
      isActive: true,
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch category products" });
  }
};

/* ✅ FEATURED PRODUCTS */
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      isActive: true,
    }).limit(20);

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch featured products" });
  }
};

/* ✅ TRENDING PRODUCTS */
exports.getTrendingProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isTrending: true,
      isActive: true,
    }).limit(20);

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trending products" });
  }
};

/* ✅ OFFER PRODUCTS */
exports.getOfferProducts = async (req, res) => {
  try {
    const products = await Product.find({
      offerPercentage: { $gt: 0 },
      isActive: true,
    }).sort({ offerPercentage: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch offer products" });
  }
};

/* ✅ CREATE MANUAL PRODUCT (ADMIN / INTERNAL) */
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
    res.status(500).json({ message: "Failed to create product" });
  }
};