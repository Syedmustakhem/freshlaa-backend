const axios = require("axios");
const Product = require("../models/Product");

/* ---------- TEST SHOPIFY CONNECTION ---------- */
const testShopifyConnection = async (req, res) => {
  try {
    const response = await axios.get(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/products.json?limit=1`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Shopify connected successfully ✅",
      product: response.data.products[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Shopify connection failed ❌",
      error: error.response?.data || error.message,
    });
  }
};

/* ---------- SYNC PRODUCTS ---------- */
const syncProductsFromShopify = async (req, res) => {
  try {
    const response = await axios.get(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/products.json?limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
        },
      }
    );

    const products = response.data.products;

    for (const item of products) {
 await Product.findOneAndUpdate(
  { shopifyId: item.id, allowShopifySync: true },
  {
    name: item.title,
    description: item.body_html || "",
    price: item.variants?.[0]?.price || 0,
    image: item.image?.src || "",
    stock: item.variants?.[0]?.inventory_quantity || 0,
    category: item.product_type || "general",
    source: "shopify",
  },
  { upsert: true, new: true }
);

    }

    res.status(200).json({
      success: true,
      message: "Products synced from Shopify ✅",
      count: products.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Shopify sync failed ❌",
      error: error.message,
    });
  }
};

module.exports = {
  testShopifyConnection,
  syncProductsFromShopify,
};
