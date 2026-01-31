const express = require("express");
const router = express.Router();
const OfferPage = require("../models/OfferPage");

router.get("/offers-page/:slug", async (req, res) => {
  try {
    const page = await OfferPage.findOne({
      slug: req.params.slug,
    });

    if (!page) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(page);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
