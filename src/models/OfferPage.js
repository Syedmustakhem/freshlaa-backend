const mongoose = require("mongoose");

const OfferProductSchema = new mongoose.Schema({
  title: String,
  image: String,
  price: Number,
  mrp: Number,
  discount: Number,
});

const OfferPageSchema = new mongoose.Schema({
  slug: { type: String, unique: true }, // "maxxed-out-sale"
  banner: String,
  title: String,
  sections: [
    {
      title: String, // "Limited time deals"
      products: [OfferProductSchema],
    },
  ],
});

module.exports = mongoose.model("OfferPage", OfferPageSchema);
