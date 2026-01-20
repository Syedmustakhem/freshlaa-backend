const express = require("express");
const router = express.Router();

const adminAuth = require("../middlewares/adminAuth");

const {
  getAllProducts,
  getAllProductsAdmin,
  getProductById,
  searchProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getTrendingProducts,
  getOfferProducts,
  createManualProduct,
  updateProduct,
} = require("../controllers/product.controller");

/* ================= TEST ================= */
router.get("/test", (req, res) => {
  res.send("Product route working ✅");
});

/* ================= PUBLIC ROUTES ================= */
router.get("/featured", getFeaturedProducts);
router.get("/trending", getTrendingProducts);
router.get("/offers", getOfferProducts);

router.get("/search", searchProducts);
router.get("/category/:category", getProductsByCategory);

/* ================= ADMIN ROUTES ================= */
router.get("/admin/all", adminAuth, getAllProductsAdmin);
router.post("/manual", adminAuth, createManualProduct);
router.put("/:id", adminAuth, updateProduct);

/* ================= BASIC ROUTES (LAST) ================= */
router.get("/:id", getProductById);
router.get("/", getAllProducts);

module.exports = router;
