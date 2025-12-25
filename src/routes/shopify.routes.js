const express = require("express");
const router = express.Router();
const {
  testShopifyConnection,
  syncProductsFromShopify,
} = require("../controllers/shopify.controller");

router.get("/test", testShopifyConnection);
router.post("/sync-products", syncProductsFromShopify);

module.exports = router;
