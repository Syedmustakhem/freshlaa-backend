const jwt = require("jsonwebtoken");

const generateLucentJwt = () => {
  if (!process.env.OTP_API_KEY || !process.env.OTP_API_SECRET) {
    throw new Error("Lucent OTP env vars missing");
  }

  return jwt.sign(
    {
      iss: process.env.OTP_API_KEY,
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes
    },
    Buffer.from(process.env.OTP_API_SECRET, "base64"),
    { algorithm: "HS256" }
  );
};

module.exports = generateLucentJwt;