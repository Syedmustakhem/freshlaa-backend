const Product = require("../models/Product");
const Category = require("../models/Category"); // ✅ ADD THIS

/* ================= VARIANT NORMALIZER ================= */
const normalizeVariants = (variants) => {
  const allowedUnits = ["kg", "g", "l", "ml", "pcs"];

  return variants.map((v, i) => {
    if (!allowedUnits.includes(v.unit)) {
      throw new Error(`Invalid unit in variant ${i + 1}`);
    }

    const value = Number(v.value);
    const price = Number(v.price);
    const mrp = Number(v.mrp || price);
    const stock = Number(v.stock || 0);

    if (
      isNaN(value) || value <= 0 ||
      isNaN(price) || price < 0 ||
      isNaN(mrp) || mrp < 0 ||
      isNaN(stock) || stock < 0
    ) {
      throw new Error(`Invalid numeric values in variant ${i + 1}`);
    }

    return {
      label: v.label.trim(),
      unit: v.unit,
      value,
      price,
      mrp,
      stock,
      isDefault: Boolean(v.isDefault),
    };
  });
};

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

    products.forEach(p => {
      p.variants = p.variants.filter(v => v.stock > 0);
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};
exports.getTrendingProducts = async (req, res) => {
  try {
    const trending = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQty: { $sum: "$items.qty" },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      trending,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* ================= GET PRODUCT BY ID ================= */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

if (!product) {
  return res.status(404).json({
    success: false,
    message: "Product not found",
  });

    }

    product.variants = product.variants.filter(v => v.stock > 0);

    res.json({
      success: true,
      data: product,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
    });
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

    products.forEach(p => {
      p.variants = p.variants.filter(v => v.stock > 0);
    });

    res.json({
      success: true,
      data: products,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

/* ================= CATEGORY PRODUCTS ================= */
exports.getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category?.trim().toLowerCase();

    const products = await Product.find({
      category,
      isActive: true,
      stock: { $gt: 0 },
    }).lean();

    products.forEach(p => {
      p.variants = p.variants.filter(v => v.stock > 0);
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("getProductsByCategory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category products",
    });
  }
};

/* ================= FEATURED ================= */
exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    stock: { $gt: 0 },
  }).lean();

  products.forEach(p => {
    p.variants = p.variants.filter(v => v.stock > 0);
  });

  res.json({
    success: true,
    data: products,
  });
};


/* ================= OFFERS ================= */
exports.getOfferProducts = async (req, res) => {
  const products = await Product.find({
    offerPercentage: { $gt: 0 },
    isActive: true,
    stock: { $gt: 0 },
  }).lean();

  products.forEach(p => {
    p.variants = p.variants.filter(v => v.stock > 0);
  });

  res.json({
    success: true,
    data: products,
  });
};
// ADMIN – GET ALL PRODUCTS (NO LIMIT)
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error("getAllProductsAdmin error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load products",
    });
  }
};


/* ================= CREATE PRODUCT ================= */
exports.createManualProduct = async (req, res) => {
  try {
    const data = req.body;
if (!Array.isArray(data.images) || data.images.length === 0) {
  return res.status(400).json({
    success: false,
    message: "At least one product image is required",
  });
}

   if (!data.name || !data.category) {
  return res.status(400).json({
    success: false,
    message: "Name and category are required",
  });
}

    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product must have at least one variant",
      });
    }

    const variants = normalizeVariants(data.variants);

    if (!variants.some(v => v.isDefault)) {
      variants[0].isDefault = true;
    }

    data.variants = variants;
    data.stock = variants.reduce((sum, v) => sum + v.stock, 0);

    // keep old category for backward compatibility
data.category = data.category.toLowerCase();
data.sectionId = data.sectionId || null;
data.subCategory = data.category; // keep compatibility if needed
    const product = await Product.create(data);

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Create product failed",
    });
  }
};

/* ================= ZEPTO: PRODUCTS BY SUB CATEGORY ================= */
exports.getProductsBySubCategory = async (req, res) => {
  try {
    const { sectionId, subCategory } = req.query;

  if (!subCategory) {
  return res.status(400).json({
    success: false,
    message: "subCategory is required",
  });
}

    const products = await Product.find({
      sectionId,
      subCategory,
      isActive: true,
      stock: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .lean();

    products.forEach(p => {
      p.variants = p.variants.filter(v => v.stock > 0);
    });

    res.json({ success: true, data: products });
  } catch (err) {
    console.error("getProductsBySubCategory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-category products",
    });
  }
};


/* ================= UPDATE PRODUCT ================= */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // BASIC INFO
    if (typeof data.name === "string" && data.name.trim()) {
      product.name = data.name.trim();
    }

    if (typeof data.description === "string") {
      product.description = data.description;
    }

    // CATEGORY (SAFE)
    if (data.category) {
      product.category = data.category.toLowerCase();
    }

    if (data.sectionId) {
      product.sectionId = data.sectionId;
    }

    if (data.category) {
  product.subCategory = data.category.toLowerCase();
}

    // IMAGES
    if (Array.isArray(data.images) && data.images.length > 0) {
      product.images = data.images;
    }

    // FLAGS
    if (typeof data.isFeatured === "boolean")
      product.isFeatured = data.isFeatured;

    if (typeof data.isTrending === "boolean")
      product.isTrending = data.isTrending;

    if (typeof data.isActive === "boolean")
      product.isActive = data.isActive;

    if (typeof data.offerPercentage === "number")
      product.offerPercentage = data.offerPercentage;

    // VARIANTS
    if (Array.isArray(data.variants) && data.variants.length > 0) {
      const variants = normalizeVariants(data.variants);

      if (!variants.some(v => v.isDefault)) {
        variants[0].isDefault = true;
      }

      product.variants = variants;
      product.stock = variants.reduce((sum, v) => sum + v.stock, 0);
    }

    await product.save();

    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Update failed",
    });
  }
};
// product.controller.js
exports.getProductsByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.query;

    if (!slug) {
      return res.json({ success: true, data: [] });
    }

    const products = await Product.find({
      category: slug,           // ✅ slug match
      isActive: true,
      stock: { $gt: 0 },
    }).lean();

    products.forEach(p => {
      p.variants = p.variants?.filter(v => v.stock > 0);
    });

    res.json({ success: true, data: products });
  } catch (err) {
    console.error("by-category-slug error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load products",
    });
  }
};
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};
exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      data: { isActive: product.isActive },
    });
  } catch (err) {
    console.error("Toggle product status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update product status",
    });
  }
};
/* ================= ZEPTO: PRODUCTS BY SECTION + SUBCATEGORY ================= */
exports.getProductsBySection = async (req, res) => {
  try {
    const { sectionId, subCategory } = req.query;

    if (!sectionId) {
      return res.json({ success: true, data: [] });
    }

    let query = {
      sectionId,
      isActive: true,
      stock: { $gt: 0 },
    };

    // 🔥 TOP PICKS (NO subCategory selected)
    if (!subCategory) {
      query.isFeatured = true;   // ✅ ONLY featured products
    } 
    // 🔥 NORMAL SUB CATEGORY
    else {
      query.subCategory = subCategory.toLowerCase();
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .lean();

    products.forEach(p => {
      p.variants = p.variants.filter(v => v.stock > 0);
    });

    res.json({ success: true, data: products });

  } catch (err) {
    console.error("getProductsBySection error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch section products",
    });
  }
};