const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");

const {
  createOrder,
  getMyOrders,
  getOrderById,
} = require("../controllers/order.controller");

router.post("/", protect, createOrder);
router.get("/", protect, getMyOrders);
router.get("/:id", protect, getOrderById);

module.exports = router;