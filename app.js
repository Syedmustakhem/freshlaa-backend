const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");
const productRoutes = require("./src/routes/product.routes");
const orderRoutes = require("./src/routes/order.routes");
const addressRoutes = require("./src/routes/address.routes");
const cartRoutes = require("./src/routes/cart.routes");
const userRoutes = require("./src/routes/user.routes");
const notificationRoutes = require("./src/routes/notification.routes");

const paymentMethodRoutes = require("./src/routes/paymentMethod.routes");
const razorpayRoutes = require("./src/routes/razorpay.routes");

const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/hotel/menu", hotelMenuRoutes);

app.use("/api/payment-methods", paymentMethodRoutes); // ✅ DB
app.use("/api/razorpay", razorpayRoutes);             // ✅ Transactions

app.get("/", (req, res) => {
  res.send("Freshlaa Backend Running ✅");
});

module.exports = app;
