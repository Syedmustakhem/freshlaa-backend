const Product = require("../models/Product");

/* ✅ GET ALL PRODUCTS (WITH SEARCH + CATEGORY + PAGINATION) */
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
    } = req.query;

    const query = { isActive: true };

    // 🔍 SEARCH BY NAME
    if (search && search.trim() !== "") {
      query.name = { $regex: search, $options: "i" };
    }

    // 🏷️ FILTER BY CATEGORY
    if (category && category.trim() !== "") {
      query.category = category.toLowerCase();
    }

    const products = await Product.find(query)
      .select(
        "name price image qty category stock isFeatured isTrending offerPercentage"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json(products);
  } catch (err) {
    console.error("❌ getAllProducts error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};
