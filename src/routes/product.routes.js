const express = require("express");
const router = express.Router();
const adminAuth = require("../middlewares/adminAuth");
const Product = require("../models/Product");

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
} = productController;

/* ================= ADMIN ROUTES ================= */
router.get("/admin/all", adminAuth, getAllProductsAdmin);

/* ✅ TOGGLE PRODUCT STATUS */
router.patch("/:id/status", adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      data: { isActive: product.isActive },
    });
  } catch (err) {
    console.error("Toggle product status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update product status",
    });
  }
});

/* ✅ DELETE PRODUCT */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
});

/* ================= CREATE / UPDATE ================= */
router.post("/manual", adminAuth, createManualProduct);
router.put("/:id", adminAuth, updateProduct);

/* ================= USER / APP ROUTES ================= */
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
