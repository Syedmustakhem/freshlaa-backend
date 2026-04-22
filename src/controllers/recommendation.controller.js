const UserActivity = require("../models/UserActivity");
const Product = require("../models/Product");
const Order = require("../models/Order");

const PRODUCT_SELECT_FIELDS = "name images variants offerPercentage category subCategory isActive stock";

// ✅ STILL LOOKING
exports.getStillLooking = async (req, res) => {
  try {
    const { userId } = req.params;

    const activity = await UserActivity.findOne({ userId });

    // 🔥 FALLBACK FOR NEW USERS
    if (!activity) {
      const fallback = await Product.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);

      return res.json(fallback);
    }

    const recentSearches = activity.searches
      .slice(-5)
      .map(s => s.keyword);

    const recentViews = activity.viewedProducts
      .slice(-5)
      .map(v => v.productId);

    let products = await Product.find({
      $or: [
        { subCategory: { $in: recentSearches } },
        { _id: { $in: recentViews } }
      ],
      isActive: { $ne: false }
    })
      .limit(10)
      .select(PRODUCT_SELECT_FIELDS);

    // 🔥 IF NO MATCH → FALLBACK
    if (!products.length) {
      products = await Product.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
    }

    res.json(products);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ ALSO BOUGHT (People Also Bought)
exports.getAlsoBought = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Get user's past orders
    const pastOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // 2. Extract product IDs from past orders
    const pastProductIds = [];
    pastOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.productId && item.itemModel === "Product") {
          pastProductIds.push(item.productId);
        }
      });
    });

    let products = [];

    // 3. If user has past purchases, try to find co-purchased items 
    // For simplicity, we suggest items in the same categories they usually buy
    // In a real ML system, this would be actual market basket analysis
    if (pastProductIds.length > 0) {
      const purchasedProducts = await Product.find({ _id: { $in: pastProductIds } });
      const favoriteCategories = [...new Set(purchasedProducts.map(p => p.category))];

      products = await Product.find({
        category: { $in: favoriteCategories },
        _id: { $nin: pastProductIds }, // don't recommend exact same items they just bought
        isActive: { $ne: false }
      })
        .sort({ popularity: -1, createdAt: -1 }) // if popularity exists, or fallback to newest
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
    }

    // 4. Fallback if no specific recommendations or no orders
    if (!products.length) {
      products = await Product.find({ isActive: { $ne: false } })
        .sort({ popularity: -1, createdAt: -1 })
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

    const activity = await UserActivity.findOne({ userId });

    if (!activity) {
      const trending = await Product.find({ isActive: { $ne: false } })
        .sort({ popularity: -1, createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);

      return res.json(trending);
    }

    const keywords = (activity.searches || []).map(s => s.keyword).filter(Boolean);

    const viewedProductIds = (activity.viewedProducts || []).map(v => v.productId);
    const viewedProducts = await Product.find({
      _id: { $in: viewedProductIds },
      isActive: { $ne: false }
    });

    const categories = viewedProducts.map(p => p.category).filter(Boolean);

    const signals = [...new Set([...keywords, ...categories])];

    let products = [];
    if (signals.length > 0) {
      products = await Product.find({
        $or: [
          { category: { $in: signals } },
          { subCategory: { $in: signals } }
        ],
        isActive: { $ne: false }
      })
        .sort({ popularity: -1, createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
    }

    // Fallback
    if (!products.length) {
      const trending = await Product.find({ isActive: { $ne: false } })
        .sort({ popularity: -1, createdAt: -1 })
        .limit(10)
        .select(PRODUCT_SELECT_FIELDS);
      return res.json(trending);
    }

    return res.json(products);

  } catch (err) {
    console.error("Suggested Error:", err);
    return res.status(500).json({ error: err.message });
  }
};