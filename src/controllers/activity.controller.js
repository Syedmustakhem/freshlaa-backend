const UserActivity = require("../models/UserActivity");

// ✅ SAVE SEARCH
exports.saveSearch = async (req, res) => {
  try {
    const { userId, keyword } = req.body;

    await UserActivity.findOneAndUpdate(
      { userId },
      {
        $push: {
          searches: {
            $each: [{ keyword: keyword.toLowerCase() }],
            $slice: -20 // keep only last 20 searches
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ SAVE PRODUCT VIEW
exports.saveView = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    await UserActivity.findOneAndUpdate(
      { userId },
      {
        $push: {
          viewedProducts: {
            $each: [{ productId }],
            $slice: -20 // keep last 20 viewed
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};