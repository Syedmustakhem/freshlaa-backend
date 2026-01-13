const Product = require("../models/Product");

/* ================= GET ALL PRODUCTS ================= */
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;

    const query = {
      isActive: true,
      stock: { $gt: 0 },
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) {
      query.category = category.toLowerCase();
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ================= GET PRODUCT BY ID ================= */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🔥 show only available variants
    product.variants = product.variants.filter(v => v.stock > 0);

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error fetching product" });
  }
};

/* ================= SEARCH PRODUCTS ================= */
exports.searchProducts = async (req, res) => {
  try {
    const q = req.query.q || "";

    const products = await Product.find({
      name: { $regex: q, $options: "i" },
      isActive: true,
      stock: { $gt: 0 },
    }).lean();

    res.json(products);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
};

/* ================= CATEGORY ================= */
exports.getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.category.toLowerCase(),
      isActive: true,
      stock: { $gt: 0 },
    }).lean();

    res.json(products);
  } catch {
    res.status(500).json({ message: "Category fetch failed" });
  }
};

/* ================= FEATURED ================= */
exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    stock: { $gt: 0 },
  }).lean();

  res.json(products);
};

/* ================= TRENDING ================= */
exports.getTrendingProducts = async (req, res) => {
  const products = await Product.find({
    isTrending: true,
    isActive: true,
    stock: { $gt: 0 },
  }).lean();

  res.json(products);
};

/* ================= OFFERS ================= */
exports.getOfferProducts = async (req, res) => {
  const products = await Product.find({
    offerPercentage: { $gt: 0 },
    isActive: true,
    stock: { $gt: 0 },
  }).lean();

  res.json(products);
};
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    /* ---------------- BASIC FIELDS ---------------- */
    if (data.name !== undefined) product.name = data.name;
    if (data.description !== undefined) product.description = data.description;
    if (data.category !== undefined)
      product.category = data.category.toLowerCase();

    if (Array.isArray(data.images) && data.images.length > 0) {
      product.images = data.images;
    }

    /* ---------------- FLAGS ---------------- */
    if (typeof data.isFeatured === "boolean")
      product.isFeatured = data.isFeatured;

    if (typeof data.isTrending === "boolean")
      product.isTrending = data.isTrending;

    if (typeof data.isActive === "boolean")
      product.isActive = data.isActive;

    if (typeof data.offerPercentage === "number")
      product.offerPercentage = data.offerPercentage;

    /* ---------------- VARIANTS ---------------- */
    if (Array.isArray(data.variants) && data.variants.length > 0) {
      // validate variant stock
      for (const v of data.variants) {
        if (typeof v.stock !== "number" || v.stock < 0) {
          return res.status(400).json({
            message: "Each variant must have valid stock",
          });
        }
      }

      // ensure default variant
      if (!data.variants.some(v => v.isDefault)) {
        data.variants[0].isDefault = true;
      }

      product.variants = data.variants;

      // 🔥 auto-calc product stock
      product.stock = data.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0
      );
    }

    await product.save();

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({
      message: err.message || "Update failed",
    });
  }
};

/* ================= CREATE MANUAL PRODUCT ================= */
exports.createManualProduct = async (req, res) => {
  try {
    const data = req.body;

    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      return res.status(400).json({
        message: "Product must have at least one variant",
      });
    }

    // 🔥 Validate variant stock
    for (const v of data.variants) {
      if (typeof v.stock !== "number" || v.stock < 0) {
        return res.status(400).json({
          message: "Each variant must have valid stock",
        });
      }
    }

    // 🔥 Ensure one default variant
    if (!data.variants.some(v => v.isDefault)) {
      data.variants[0].isDefault = true;
    }

    // 🔥 Product stock = sum of variant stocks
    data.stock = data.variants.reduce(
      (sum, v) => sum + v.stock,
      0
    );

    const product = await Product.create(data);

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({
      message: err.message || "Create product failed",
    });
  }
};
