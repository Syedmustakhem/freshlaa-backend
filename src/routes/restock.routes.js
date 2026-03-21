// src/routes/restock.routes.js

const express = require("express");
const router  = express.Router();
const { subscribe, getSubscriberCount, unsubscribe } = require("../controllers/restock.controller");

// POST /api/restock/subscribe
router.post("/subscribe", subscribe);

// DELETE /api/restock/unsubscribe
router.delete("/unsubscribe", unsubscribe);

// GET /api/restock/count/:productId  — admin use
router.get("/count/:productId", getSubscriberCount);

module.exports = router;