////jwt.js
const jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET;

// Generate a JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, secretKey, { expiresIn: "6h" });
};

// Verify a JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    return true; // Token is valid
  } catch (error) {
    return false; // Token is invalid or expired
  }
};

// Middleware to protect routes
const protect = (req, res, next) => {
  // Get the token from the cookie
  const token = req.cookies.authToken;

  if (!token) {
    return res.redirect("/login"); // Redirect to login if no token
  }

  // Verify the token
  const isValid = verifyToken(token);
  if (!isValid) {
    res.clearCookie("authToken"); // Clear invalid token
    return res.redirect("/login"); // Redirect to login if token is invalid
  }

  next(); // Proceed to the route handler
};

const api_protect = (req, res, next) => {
  // Get the token from the cookie
  const token = req.cookies.authToken;

  if (!token) {
    return res.json({ sucess: false, redirect: "/login" });
  }

  // Verify the token
  const isValid = verifyToken(token);
  if (!isValid) {
    res.clearCookie("authToken"); // Clear invalid token
    return res.json({ success: false, redirect: "/login" });
  }

  next(); // Proceed to the route handler
};

module.exports = { generateToken, verifyToken, protect, api_protect };
