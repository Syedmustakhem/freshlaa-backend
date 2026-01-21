const User = require("../../models/User");
const Order = require("../../models/Order");

exports.getDashboardMetrics = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    /* ================= COUNTS ================= */
    const totalUsers = await User.countDocuments({ isBlocked: false });
    const totalOrders = await Order.countDocuments();

    /* ================= REVENUE ================= */
    const revenueAgg = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    /* ================= TODAY ORDERS ================= */
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: todayStart },
    });

    /* ================= STATUS BREAKDOWN ================= */
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    /* ================= RECENT ORDERS ================= */
    const recentOrders = await Order.find()
      .populate("user", "name phone")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue,
        todayOrders,
        statusStats,
        recentOrders,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard metrics",
    });
  }
};
