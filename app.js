require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* ================= ROUTE IMPORTS (PM2 SAFE) ================= */

const routesPath = path.join(__dirname, "src", "routes");

const adminRoutes = require(path.join(routesPath, "admin.routes"));
const authRoutes = require(path.join(routesPath, "auth.routes"));
const productRoutes = require(path.join(routesPath, "product.routes"));
const orderRoutes = require(path.join(routesPath, "order.routes"));
const addressRoutes = require(path.join(routesPath, "address.routes"));
const cartRoutes = require(path.join(routesPath, "cart.routes"));
const userRoutes = require(path.join(routesPath, "user.routes"));
const notificationRoutes = require(path.join(routesPath, "notification.routes"));
const hotelMenuRoutes = require(path.join(routesPath, "hotelMenu.routes"));
const paymentMethodRoutes = require(path.join(routesPath, "paymentMethod.routes"));
const razorpayRoutes = require(path.join(routesPath, "razorpay.routes"));
const restaurantRoutes = require(path.join(routesPath, "restaurant.routes"));
const categoryRoutes = require(path.join(routesPath, "category.routes"));
const bannerRoutes = require(path.join(routesPath, "banner.routes"));
const adminPushRoutes = require(path.join(routesPath, "admin.push.routes"));
const homeSectionRoutes = require(
  path.join(routesPath, "homeSection.routes")
);
const categoryBannerRoutes = require(
  path.join(routesPath, "categoryBanner.routes")
);

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: [
      "https://admin.freshlaa.com",
      "https://freshlaa-admin.onrender.com",
      "https://www.freshlaa.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hotel/menu", hotelMenuRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/razorpay", razorpayRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/admin/push", adminPushRoutes);
app.use("/api", homeSectionRoutes);
app.use("/api", categoryBannerRoutes);

/* ================= HEALTH ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Freshlaa Backend Running ✅",
  });
});

/* ================= 404 ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* ================= ERROR ================= */

app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
