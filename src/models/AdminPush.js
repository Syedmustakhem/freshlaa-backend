const mongoose = require("mongoose");

const adminPushSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true },
    subscription: { type: Object, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminPush", adminPushSchema);
