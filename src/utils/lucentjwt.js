const jwt = require("jsonwebtoken");

const generateLucentJwt = () => {
  const secret = Buffer.from(process.env.OTP_API_SECRET, "base64");

  return jwt.sign(
    {
      iss: process.env.OTP_API_KEY,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes
    },
    secret,
    { algorithm: "HS256" }
  );
};

module.exports = generateLucentJwt;
