const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
{
 name: { type: String, required: true },
 email: { type: String, required: true, unique: true },
 password: { type: String, required: true },
 isActive: { type: Boolean, default: true },

 // ✅ ADD THIS
 expoPushTokens: {
  type: [String],
  default: []
 },

 webPushSubscriptions: {
  type: [Object],
  default: []
 }

},
{ timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);