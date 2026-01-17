require("dotenv").config(); // ✅ MUST BE FIRST

const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./src/routes/auth.routes");
const productRoutes = require("./src/routes/product.routes");
const orderRoutes = require("./src/routes/order.routes");
const addressRoutes = require("./src/routes/address.routes");
const cartRoutes = require("./src/routes/cart.routes");
const userRoutes = require("./src/routes/user.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const hotelMenuRoutes = require("./src/routes/hotelMenu.routes");
const paymentMethodRoutes = require("./src/routes/paymentMethod.routes");
const razorpayRoutes = require("./src/routes/razorpay.routes");
const restaurantRoutes = require("./src/routes/restaurant.routes");
const categoryRoutes = require("./src/routes/category.routes");

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
app.use("/api/category", categoryRoutes);

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Freshlaa Backend Running ✅",
  });
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error issue.",
  });
});

module.exports = app;
