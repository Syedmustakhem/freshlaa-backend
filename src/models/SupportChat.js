// models/SupportChat.js
const mongoose = require("mongoose");

// ─── Single message ───────────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema(
  {
    sender:    { type: String, enum: ["user", "bot", "agent"], required: true },
    text:      { type: String, required: true },
    read:      { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Chat session (one per user) ─────────────────────────────────────────────
const SupportChatSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    userName:  { type: String, default: "User" },
    userPhone: { type: String, default: "" },

    // Optional — links chat to a specific order
    orderId:   { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    // bot    → only bot is replying
    // waiting → user sent message, waiting for agent
    // active  → live agent is in the chat
    // resolved → chat closed by agent
    status: {
      type:    String,
      enum:    ["bot", "waiting", "active", "resolved"],
      default: "bot",
    },

    agentTyping:    { type: Boolean, default: false },
    messages:       [MessageSchema],
    lastMessage:    { type: String,  default: "" },
    lastMessageAt:  { type: Date,    default: Date.now },
    unreadByAgent:  { type: Number,  default: 0 },   // badge on admin panel
    unreadByUser:   { type: Number,  default: 0 },   // badge on user app
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportChat", SupportChatSchema);