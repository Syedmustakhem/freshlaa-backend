const Product = require("../models/Product");

/* GET ALL PRODUCTS */
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;

    const query = { isActive: true };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) {
      query.category = category.toLowerCase();
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* GET PRODUCT BY ID */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch {
    res.status(500).json({ message: "Error fetching product" });
  }
};

/* SEARCH PRODUCTS */
exports.searchProducts = async (req, res) => {
  try {
    const q = req.query.q || "";
    const products = await Product.find({
      name: { $regex: q, $options: "i" },
      isActive: true,
    });
    res.json(products);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
};

/* CATEGORY */
exports.getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.category.toLowerCase(),
      isActive: true,
    });
    res.json(products);
  } catch {
    res.status(500).json({ message: "Category fetch failed" });
  }
};

/* FEATURED */
exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true });
  res.json(products);
};

/* TRENDING */
exports.getTrendingProducts = async (req, res) => {
  const products = await Product.find({ isTrending: true, isActive: true });
  res.json(products);
};

/* OFFERS */
exports.getOfferProducts = async (req, res) => {
  const products = await Product.find({
    offerPercentage: { $gt: 0 },
    isActive: true,
  });
  res.json(products);
};
exports.createManualProduct = async (req, res) => {
  try {
    const data = req.body;

    /* 🔴 VALIDATE VARIANTS EXIST */
    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      return res.status(400).json({
        message: "Product must have at least one variant",
      });
    }

    /* 🔴 ENSURE ONE DEFAULT VARIANT */
    const hasDefault = data.variants.some(v => v.isDefault === true);
    if (!hasDefault) {
      data.variants[0].isDefault = true;
    }

    /* 🔴 DETECT UNIT TYPE (weight OR piece) */
    const unitType = data.variants[0].unitType;

    if (!["weight", "piece"].includes(unitType)) {
      return res.status(400).json({
        message: "Invalid unitType in variants",
      });
    }

    /* 🔴 VALIDATE EACH VARIANT */
    for (const v of data.variants) {
      if (
        !v.label ||
        typeof v.value !== "number" ||
        typeof v.price !== "number" ||
        typeof v.mrp !== "number" ||
        v.unitType !== unitType
      ) {
        return res.status(400).json({
          message: "Invalid variant data",
        });
      }
    }

    const product = await Product.create(data);

    res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({
      message: err.message || "Create product failed",
    });
  }
};

