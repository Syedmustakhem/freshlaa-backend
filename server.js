const dotenv = require("dotenv");
dotenv.config();
const redisClient = require("./redisClient");
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./src/config/db");

// ✅ Cart recovery cron
const { runCartRecoveryCron } = require("./src/controllers/cartRecovery.controller");

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://admin.freshlaa.com",
      "https://freshlaa-admin.onrender.com",
      "https://www.freshlaa.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
  },
});

global.io = io;

/* ================= SOCKET CONNECTION ================= */
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("join-order", (orderId) => {
    if (!orderId) return;
    const roomId = String(orderId);
    socket.join(roomId);
    console.log(`📦 Socket ${socket.id} joined order room: ${roomId}`);
  });

  socket.on("leave-order", (orderId) => {
    const roomId = String(orderId);
    socket.leave(roomId);
    console.log(`🚪 Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on("join-app", () => {
    socket.join("app-users");
    console.log(`📱 App user joined: ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

/* ================= CART RECOVERY CRON ================= */
// Run once 2 mins after startup, then every 15 mins
setTimeout(() => {
  console.log("[Cron] Initial cart recovery check...");
  runCartRecoveryCron();
}, 2 * 60 * 1000);

setInterval(() => {
  console.log("[Cron] Running cart recovery check...");
  runCartRecoveryCron();
}, 15 * 60 * 1000);

/* ================= START SERVER ================= */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Freshlaa backend + Socket.io running on port ${PORT}`);
});