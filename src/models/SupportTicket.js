// models/SupportTicket.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender:      { type: String, enum: ["user", "bot", "agent"], required: true },
    text:        { type: String, default: "" },
    attachments: [{ type: String }], // Array of image URLs
    read:        { type: Boolean, default: false },
    createdAt:   { type: Date, default: Date.now },
  },
  { _id: true }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName:  { type: String, default: "User" },
    userPhone: { type: String, default: "" },

    // Optional — links ticket to a specific order
    orderId:   { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    
    // Category (e.g. "Order", "Payment", "Account", "Delivery", "Product Request")
    category: { type: String, required: true },
    
    // Specific Issue (e.g. "Missing Item", "Damaged Product", "Late Delivery")
    issue:    { type: String, required: true },

    // open    → new ticket, bot or agent might respond
    // waiting → user sent message, waiting for agent
    // active  → live agent is handling
    // resolved → issue fixed
    // closed  → archvied
    status: {
      type:    String,
      enum:    ["open", "waiting", "active", "resolved", "closed"],
      default: "open",
    },

    agentId:        { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    messages:       [MessageSchema],
    lastMessage:    { type: String,  default: "" },
    lastMessageAt:  { type: Date,    default: Date.now },
    unreadByAgent:  { type: Number,  default: 0 },
    unreadByUser:   { type: Number,  default: 0 },
  },
  { timestamps: true }
);

// Index for performance
SupportTicketSchema.index({ userId: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1 });

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
