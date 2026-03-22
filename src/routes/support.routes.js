// routes/support.routes.js
// Mount in app.js: app.use("/api/support", require("./routes/support.routes"));

const express    = require("express");
const router     = express.Router();
const SupportChat = require("../models/SupportChat");
const auth = require("../middlewares/auth.middleware");
// ─── BOT CONFIG ───────────────────────────────────────────────────────────────
// After BOT_HANDOFF_THRESHOLD user messages, status flips to "waiting"
// and the bot says "Connecting you to a live agent..."
const BOT_HANDOFF_THRESHOLD = 2;

// Keyword → bot reply map (case-insensitive)
const BOT_REPLIES = [
  {
    keywords: ["where", "track", "location", "status", "order"],
    reply:    "You can track your active order by going to Orders → Tap your order → Track. 📍 If you need more help, I'm connecting you to an agent!",
  },
  {
    keywords: ["cancel"],
    reply:    "Orders can be cancelled while in 'Placed' or 'Packed' status. Go to Orders → your order → Cancel. ❌ If it's already out for delivery, please contact our agent.",
  },
  {
    keywords: ["damage", "broken", "wrong", "missing", "bad"],
    reply:    "We're really sorry about that! 😔 Please share your Order ID and a photo of the issue. Our team will resolve it within 24 hours.",
  },
  {
    keywords: ["refund", "money", "return", "paid"],
    reply:    "Refunds for online payments are processed within 5–7 business days 💰. COD orders get wallet credit instantly. Our agent will confirm the details shortly.",
  },
  {
    keywords: ["delivery", "late", "delay", "time", "when"],
    reply:    "Delivery typically takes 30–60 minutes depending on your area and order size 🛵. Our agent can give you a live update!",
  },
  {
    keywords: ["promo", "coupon", "discount", "offer", "code"],
    reply:    "Check the Offers section in the app for current promo codes 🎁. Our agents can also help apply any valid codes manually.",
  },
  {
    keywords: ["payment", "upi", "card", "failed", "charge"],
    reply:    "Payment issues are usually resolved within a few minutes 💳. If you were charged but the order didn't place, our agent will help you immediately.",
  },
];

// Default bot reply if no keyword matched
const DEFAULT_BOT_REPLY =
  "Thanks for reaching out! 👋 Let me connect you with a Freshlaa support agent who can help you better.";

// ─── Helper: match user text to a bot reply ───────────────────────────────────
function getBotReply(text) {
  const lower = text.toLowerCase();
  for (const rule of BOT_REPLIES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.reply;
    }
  }
  return DEFAULT_BOT_REPLY;
}

// ─── Helper: emit real-time update via Socket.io ──────────────────────────────
function emitToUser(userId, event, data) {
  if (global.io) {
    global.io.to(`support_${userId}`).emit(event, data);
  }
}

// ─── Helper: emit to admin panel (agent) ─────────────────────────────────────
function emitToAdmin(event, data) {
  if (global.io) {
    global.io.to("support_agents").emit(event, data);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/support/chat
// Get or create the user's chat session + full message history
// ═════════════════════════════════════════════════════════════════════════════
router.get("/chat", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    let chat = await SupportChat.findOne({ userId });

    // First time — create a fresh chat session with a welcome bot message
    if (!chat) {
      chat = await SupportChat.create({
        userId,
        userName:  req.user.name  || "User",
        userPhone: req.user.phone || "",
        messages: [
          {
            sender: "bot",
            text:   "Hi there! 👋 I'm Freshlaa's support assistant. How can I help you today?",
          },
        ],
        lastMessage:   "Hi there! 👋 I'm Freshlaa's support assistant.",
        lastMessageAt: new Date(),
      });
    }

    // Reset unread count for user when they open chat
    await SupportChat.findByIdAndUpdate(chat._id, { unreadByUser: 0 });

    return res.json({
      success:  true,
      chat: {
        _id:          chat._id,
        status:       chat.status,
        agentTyping:  chat.agentTyping,
        messages:     chat.messages,
        orderId:      chat.orderId,
      },
    });
  } catch (err) {
    console.log("❌ GET SUPPORT CHAT ERROR:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load chat" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/support/message
// User sends a message → bot replies → or waits for agent
// ═════════════════════════════════════════════════════════════════════════════
router.post("/message", auth, async (req, res) => {
  try {
    const userId  = req.user._id;
    const { text, orderId } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    let chat = await SupportChat.findOne({ userId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }

    // ── 1. Save the user's message ──
    const userMessage = {
      sender:    "user",
      text:      text.trim(),
      read:      false,
      createdAt: new Date(),
    };
    chat.messages.push(userMessage);
    chat.lastMessage   = text.trim();
    chat.lastMessageAt = new Date();
    chat.unreadByAgent += 1;

    // Attach orderId if provided (first time linking to an order)
    if (orderId && !chat.orderId) {
      chat.orderId = orderId;
    }

    // ── 2. Count how many user messages sent so far ──
    const userMsgCount = chat.messages.filter((m) => m.sender === "user").length;

    // ── 3. Decide: bot reply or hand off to agent ──
    let botReply = null;

    if (chat.status === "bot") {
      if (userMsgCount <= BOT_HANDOFF_THRESHOLD) {
        // Still in bot phase — send keyword reply
        botReply = getBotReply(text);
        chat.messages.push({
          sender:    "bot",
          text:      botReply,
          createdAt: new Date(),
        });
      } else {
        // Threshold reached — hand off
        botReply =
          "You're being connected to a live Freshlaa support agent. ⏳ Average wait time is under 2 minutes.";
        chat.messages.push({
          sender:    "bot",
          text:      botReply,
          createdAt: new Date(),
        });
        chat.status = "waiting";

        // Notify admin panel that a user needs an agent
        emitToAdmin("new-support-request", {
          chatId:    chat._id,
          userId,
          userName:  chat.userName,
          userPhone: chat.userPhone,
          lastMessage: text.trim(),
        });
      }
    }
    // If status is "active" (agent handling) or "waiting" — no bot reply, agent handles it

    await chat.save();

    // ── 4. Emit new user message to admin panel in real time ──
    emitToAdmin("user-message", {
      chatId:   chat._id,
      userId,
      message:  userMessage,
      status:   chat.status,
    });

    // ── 5. Emit bot reply back to user in real time ──
    if (botReply) {
      const botMsg = chat.messages[chat.messages.length - 1];
      emitToUser(userId.toString(), "new-message", {
        message: botMsg,
        status:  chat.status,
      });
    }

    return res.json({
      success:  true,
      userMessage,
      botReply: botReply
        ? { sender: "bot", text: botReply }
        : null,
      status: chat.status,
    });
  } catch (err) {
    console.log("❌ SEND SUPPORT MESSAGE ERROR:", err.message);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/support/status
// Quick poll to check if an agent has taken over
// ═════════════════════════════════════════════════════════════════════════════
router.get("/status", auth, async (req, res) => {
  try {
    const chat = await SupportChat.findOne({ userId: req.user._id }).select(
      "status agentTyping unreadByUser"
    );
    if (!chat) return res.json({ success: true, status: "bot", agentTyping: false, unreadByUser: 0 });
    return res.json({
      success:      true,
      status:       chat.status,
      agentTyping:  chat.agentTyping,
      unreadByUser: chat.unreadByUser,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get status" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/support/read
// Mark all messages as read when user opens chat
// ═════════════════════════════════════════════════════════════════════════════
router.post("/read", auth, async (req, res) => {
  try {
    await SupportChat.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          "messages.$[msg].read": true,
          unreadByUser: 0,
        },
      },
      { arrayFilters: [{ "msg.sender": { $in: ["bot", "agent"] }, "msg.read": false }] }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to mark read" });
  }
});

module.exports = router;