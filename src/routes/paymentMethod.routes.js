const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");

const {
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  setDefaultPayment,
} = require("../controllers/paymentMethod.controller");

/* ROUTES */
router.post("/", protect, addPaymentMethod);
router.get("/", protect, getPaymentMethods);
router.delete("/:id", protect, deletePaymentMethod);
router.put("/:id/default", protect, setDefaultPayment);

module.exports = router;