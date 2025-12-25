const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./src/config/db");

connectDB(); // 🔥 MUST BE CALLED

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Freshlaa backend running on port ${PORT} 🚀`);
});



