const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProductById,
  searchProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getTrendingProducts,
  getOfferProducts,
  createManualProduct,
  updateProduct,
} = require("../controllers/product.controller");

/* TEST */
router.get("/test", (req, res) => {
  res.send("Product route working ✅");
});

/* SPECIAL ROUTES FIRST */
router.get("/featured", getFeaturedProducts);
router.get("/trending", getTrendingProducts);
router.get("/offers", getOfferProducts);

/* SEARCH & CATEGORY */
router.get("/search", searchProducts);
router.get("/category/:category", getProductsByCategory);

/* MANUAL PRODUCT (ADMIN) */
router.post("/manual", createManualProduct);
router.put("/:id", updateProduct);

/* BASIC */
router.get("/:id", getProductById);
router.get("/", getAllProducts);

module.exports = router;