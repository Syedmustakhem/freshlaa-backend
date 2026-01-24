const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./src/config/db");

connectDB(); // ✅ KEEP THIS

const PORT = process.env.PORT || 5000;

// 🔥 CREATE HTTP SERVER
const server = http.createServer(app);

// 🔥 ATTACH SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: [
      "https://admin.freshlaa.com",
      "https://www.freshlaa.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
  },
});

// 🔥 MAKE SOCKET AVAILABLE EVERYWHERE
global.io = io;

// 🔥 SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("🟢 Admin connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Admin disconnected:", socket.id);
  });
});

// 🔥 START SERVER
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Freshlaa backend + Socket.io running on port ${PORT}`);
});
