const express = require("express");
const router = express.Router();
const adminAuth = require("../middlewares/adminAuth");

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
  getProductsByCategorySlug,
  toggleProductStatus,
  deleteProduct,
} = productController;

/* ================= ADMIN ================= */
router.get("/admin/all", adminAuth, getAllProductsAdmin);
router.patch("/:id/status", adminAuth, toggleProductStatus);
router.delete("/:id", adminAuth, deleteProduct);

/* ================= CREATE / UPDATE ================= */
router.post("/manual", adminAuth, createManualProduct);
router.put("/:id", adminAuth, updateProduct);

/* ================= APP ================= */
router.get("/by-section", getProductsBySection);
router.get("/by-category-slug", getProductsByCategorySlug);

router.get("/featured", getFeaturedProducts);
router.get("/trending", getTrendingProducts);
router.get("/offers", getOfferProducts);

router.get("/search", searchProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/by-sub-category", getProductsBySubCategory);

/* ================= BASIC (LAST) ================= */
router.get("/", getAllProducts);
router.get("/:id", getProductById);

module.exports = router;
