const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./src/config/db");

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

  /* 🔥 JOIN ORDER ROOM */
  socket.on("join-order", (orderId) => {
    if (!orderId) return;

    const roomId = String(orderId); // very important
    socket.join(roomId);

    console.log(`📦 Socket ${socket.id} joined order room: ${roomId}`);
  });

  /* 🔥 LEAVE ORDER ROOM (optional) */
  socket.on("leave-order", (orderId) => {
    const roomId = String(orderId);
    socket.leave(roomId);
    console.log(`🚪 Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Freshlaa backend + Socket.io running on port ${PORT}`);
});
