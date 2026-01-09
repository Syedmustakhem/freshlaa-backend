const jwt = require("jsonwebtoken");

const generateLucentJwt = () => {
  return jwt.sign(
    {
      iss: process.env.OTP_API_KEY,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes
    },
    process.env.OTP_API_SECRET, // ✅ NO Buffer, NO base64
    {
      algorithm: "HS256",
    }
  );
};

module.exports = generateLucentJwt;
