const mongoose = require("mongoose");

const CoinTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  type: {
    type: String,
    enum: ['earn', 'redeem', 'refund', 'admin_adjustment'],
    required: true
  },
  amount: { type: Number, required: true }, // Positive for credit, negative for debit
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("CoinTransaction", CoinTransactionSchema);
