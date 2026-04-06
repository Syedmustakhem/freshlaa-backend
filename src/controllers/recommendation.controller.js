const UserActivity = require("../models/UserActivity");
const Product = require("../models/Product");


// ✅ STILL LOOKING
exports.getStillLooking = async (req, res) => {
  try {
    const { userId } = req.params;

    const activity = await UserActivity.findOne({ userId });

    // 🔥 FALLBACK FOR NEW USERS
    if (!activity) {
      const fallback = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10);

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
      isActive: true
    }).limit(10);

    // 🔥 IF NO MATCH → FALLBACK
    if (!products.length) {
      products = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10);
    }

    res.json(products);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getAlsoBought = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ popularity: -1 })
      .limit(10);

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// ✅ SUGGESTED FOR YOU
exports.getSuggested = async (req, res) => {
  try {
    const { userId } = req.params;

    const activity = await UserActivity.findOne({ userId });

    if (!activity) {
      const trending = await Product.find()
        .sort({ popularity: -1 })
        .limit(10);

      return res.json(trending);
    }

    const keywords = activity.searches.map(s => s.keyword);

    const viewedProducts = await Product.find({
      _id: { $in: activity.viewedProducts.map(v => v.productId) }
    });

    const categories = viewedProducts.map(p => p.category);

    const signals = [...keywords, ...categories];

    const products = await Product.find({
      category: { $in: signals }
    })
      .sort({ popularity: -1 })
      .limit(10);

    res.json(products);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};