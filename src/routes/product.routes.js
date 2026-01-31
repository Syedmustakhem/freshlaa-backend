const express = require("express");
const router = express.Router();
const adminAuth = require("../middlewares/adminAuth");

// ✅ IMPORT CONTROLLER PROPERLY
const productController = require("../controllers/product.controller");

const {
  getAllProducts,
  getAllProductsAdmin,
  getProductById,
  searchProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getTrendingProducts,
  getProductsBySubCategory,
  getOfferProducts,
  createManualProduct,
  updateProduct,
  getProductsBySection,
  getProductsByCategorySlug, // ✅ ADD THIS
} = productController;

/* ================= ADMIN ROUTES (FIRST) ================= */
router.get("/admin/all", adminAuth, getAllProductsAdmin);

/* ================= ZEPTO ROUTES ================= */
router.get("/by-section", getProductsBySection);
router.get("/by-category-slug", getProductsByCategorySlug);

/* ================= SPECIAL ================= */
router.get("/featured", getFeaturedProducts);
router.get("/trending", getTrendingProducts);
router.get("/offers", getOfferProducts);

/* ================= SEARCH & CATEGORY ================= */
router.get("/search", searchProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/by-sub-category", getProductsBySubCategory);

/* ================= PRODUCTS ================= */
router.post("/manual", adminAuth, createManualProduct);
router.put("/:id", adminAuth, updateProduct);

/* ================= BASIC (LAST — VERY IMPORTANT) ================= */
router.get("/", getAllProducts);
router.get("/:id", getProductById);

module.exports = router;
