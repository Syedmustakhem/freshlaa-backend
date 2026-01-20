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

/* ADMIN ROUTES — FIRST */
router.get("/admin/all", adminAuth, getAllProductsAdmin);

/* SPECIAL */
router.get("/featured", getFeaturedProducts);
router.get("/trending", getTrendingProducts);
router.get("/offers", getOfferProducts);

/* SEARCH & CATEGORY */
router.get("/search", searchProducts);
router.get("/category/:category", getProductsByCategory);

/* PRODUCTS */
router.post("/manual", adminAuth, createManualProduct);
router.put("/:id", adminAuth, updateProduct);

/* BASIC (LAST) */
router.get("/", getAllProducts);
router.get("/:id", getProductById);

module.exports = router;
