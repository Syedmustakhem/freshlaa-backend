const UserActivity = require("../models/UserActivity");
const Product = require("../models/Product");
const Order = require("../models/Order");
const mongoose = require("mongoose");

const PRODUCT_SELECT_FIELDS = "name images variants offerPercentage category subCategory isActive stock";

// Helper to check if string is valid ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ✅ STILL LOOKING
exports.getStillLooking = async (req, res) => {
  try {
    const { userId } = req.params;
    let products = [];

    if (isValidObjectId(userId)) {
      const activity = await UserActivity.findOne({ userId });
      if (activity) {
        const recentSearches = (activity.searches || [])
          .slice(-5)
          .map(s => s.keyword);

        const recentViews = (activity.viewedProducts || [])
          .slice(-5)
          .map(v => v.productId);

        products = await Product.find({
          $or: [
            { category: { $in: recentSearches } },
            { subCategory: { $in: recentSearches } },
            { _id: { $in: recentViews } }
          ],
          isActive: { $ne: false }
        })
          .limit(10)
          .select(PRODUCT_SELECT_FIELDS);
      }
    }

    // 🔥 FALLBACK
    if (!products.length) {
      products = await Product.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
    }

    res.json(products);

  } catch (err) {
    console.error("Still Looking Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ ALSO BOUGHT (People Also Bought)
exports.getAlsoBought = async (req, res) => {
  try {
    const { userId } = req.params;
    let products = [];

    if (isValidObjectId(userId)) {
      // 1. Get user's past orders
      const pastOrders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5);

      // 2. Extract product IDs from past orders
      const pastProductIds = [];
      pastOrders.forEach(order => {
        (order.items || []).forEach(item => {
          if (item.productId && item.itemModel === "Product") {
            pastProductIds.push(item.productId);
          }
        });
      });

      // 3. If user has past purchases, try to find co-purchased items 
      if (pastProductIds.length > 0) {
        const purchasedProducts = await Product.find({ _id: { $in: pastProductIds } });
        const favoriteCategories = [...new Set(purchasedProducts.map(p => p.category).filter(Boolean))];

        products = await Product.find({
          category: { $in: favoriteCategories },
          _id: { $nin: pastProductIds },
          isActive: { $ne: false }
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .select(PRODUCT_SELECT_FIELDS);
      }
    }

    // 4. Fallback
    if (!products.length) {
      products = await Product.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
    }

    return res.json(products);
  } catch (err) {
    console.error("Also Bought Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ SUGGESTED FOR YOU
exports.getSuggested = async (req, res) => {
  try {
    const { userId } = req.params;
    let products = [];

    if (isValidObjectId(userId)) {
      const activity = await UserActivity.findOne({ userId });

      if (activity) {
        const keywords = (activity.searches || []).map(s => s.keyword).filter(Boolean);
        const viewedProductIds = (activity.viewedProducts || []).map(v => v.productId);
        
        const viewedProducts = await Product.find({
          _id: { $in: viewedProductIds },
          isActive: { $ne: false }
        });

        const categories = viewedProducts.map(p => p.category).filter(Boolean);
        const signals = [...new Set([...keywords, ...categories])];

        if (signals.length > 0) {
          products = await Product.find({
            $or: [
              { category: { $in: signals } },
              { subCategory: { $in: signals } }
            ],
            isActive: { $ne: false }
          })
            .sort({ createdAt: -1 })
            .limit(10)
            .select(PRODUCT_SELECT_FIELDS);
        }
      }
    }

    // Fallback
    if (!products.length) {
      products = await Product.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
    }

    return res.json(products);

  } catch (err) {
    console.error("Suggested Error:", err);
    return res.status(500).json({ error: err.message });
  }
};