// routes/supportTicket.routes.js
const express = require("express");
const router = express.Router();
const SupportTicket = require("../models/SupportTicket");
const auth = require("../middlewares/auth.middleware");

// Helper: emit real-time update via Socket.io to participants of a ticket
function emitToTicket(ticketId, event, data) {
  if (global.io) {
    global.io.to(`ticket_${ticketId}`).emit(event, data);
  }
}

// Helper: emit to admin panel (agent)
function emitToAdmin(event, data) {
  if (global.io) {
    global.io.to("support_agents").emit(event, data);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/tickets
// List all user's tickets (active first)
// ═════════════════════════════════════════════════════════════════════════════
router.get("/", auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("-messages"); // Don't send all messages in the list
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load tickets" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/tickets
// Create a new support ticket
// ═════════════════════════════════════════════════════════════════════════════
router.post("/", auth, async (req, res) => {
  try {
    const { orderId, category, issue, text, images } = req.body;

    if (!category || !issue || (!text && (!images || images.length === 0))) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      userName: req.user.name || "User",
      userPhone: req.user.phone || "",
      orderId: orderId || null,
      category,
      issue,
      messages: [
        {
          sender: "user",
          text: text || "",
          attachments: images || [],
        },
        {
          sender: "bot",
          text: `Thanks for reporting! 👋 We've raised a ticket for your ${issue} issue. A support agent will review this and get back to you shortly.`,
        }
      ],
      lastMessage: text || "Image shared",
      lastMessageAt: new Date(),
      status: "open",
    });

    // Notify agents
    emitToAdmin("new-ticket", {
      ticketId: ticket._id,
      userId: req.user._id,
      category,
      issue,
    });

    return res.json({ success: true, ticket });
  } catch (err) {
    console.error("❌ CREATE TICKET ERROR:", err.message);
    return res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/tickets/:id
// Get full history for a specific ticket
// ═════════════════════════════════════════════════════════════════════════════
router.get("/:id", auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Reset unread for user
    ticket.unreadByUser = 0;
    await ticket.save();

    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load ticket details" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/tickets/:id/message
// User adds a message to an existing ticket
// ═════════════════════════════════════════════════════════════════════════════
router.post("/:id/message", auth, async (req, res) => {
  try {
    const { text, images } = req.body;
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const newMessage = {
      sender: "user",
      text: text || "",
      attachments: images || [],
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage);
    ticket.lastMessage = text || "Image shared";
    ticket.lastMessageAt = new Date();
    ticket.unreadByAgent += 1;
    
    // Status update if closed/resolved? 
    if (ticket.status === "closed" || ticket.status === "resolved") {
      ticket.status = "waiting";
    }

    await ticket.save();

    // Real-time updates to participants in the ticket room
    emitToTicket(ticket._id, "ticket-message", {
      ticketId: ticket._id,
      message: newMessage,
    });

    return res.json({ success: true, message: newMessage });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

module.exports = router;
