const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

const {
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  setDefaultPayment,
} = require("../controllers/paymentMethod.controller");

router.post("/", auth, addPaymentMethod);
router.get("/", auth, getPaymentMethods);
router.delete("/:id", auth, deletePaymentMethod);
router.put("/:id/default", auth, setDefaultPayment);

module.exports = router;
