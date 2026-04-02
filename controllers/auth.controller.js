const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");
const sendEmail = require("../utils/mailSender");
const db = require("../models");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// In-memory store for OTPs and users
const otpStore = new Map();
const users = new Map();

const JWT_SECRET = process.env.JWT_SECRET || "ssshhhhh";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Helper: generate OTP using UUID
const generateOTP = () => uuidv4().slice(0, 6).toUpperCase(); // e.g. "A1B2C3"

exports.sendOtp = async (req, res) => {
  const { username = "", email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, error: "Email is required" });

  const otp = generateOTP();
  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });

  // In production, send OTP via email here.
  console.log(`OTP for ${email}: ${otp}`);

  await sendEmail({
    to: email,
    subject: "Email Verification",
    html: `<p>Hello ${username || ""},</p>
<p>Your OTP is <strong>${otp}</strong>. It will expire in 5 minutes.</p>`,
  });

  res.json({ success: true, message: "OTP sent successfully" });
};

exports.verifyOtp = async (req, res) => {
  const { username, email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid or expired OTP" });
  }

  otpStore.delete(email); // Remove used OTP

  let user = await db.User.findOne({
    where: {
      email,
    },
  });

  // Register the user if new
  if (!user) {
    user = await db.User.create({ username, email });
    await db.Notification.create({
      userId: user.id,
      message: `Welcome to AutoFlow.Thanks for Signing up with us.`,
      type: "sign-up",
    });
  }
  const admins = [
    "vishal.singh@jaiinfoway.com",
    "addy@jaiinfoway.com",
    "jai@jaiinfoway.com",
  ];
  const token = jwt.sign(
    { email, role: admins.includes(email) ? "admin" : "user" },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  res
    .status(200)
    .send({
      success: true,
      message: "OTP verified",
      token: token,
      username: user.username,
      email,
      role: admins.includes(email) ? "admin" : "user",
    });
};

// 1. Get Google Auth URL
exports.getGoogleAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "consent",
  });

  res.json({ url });
};

// 2. Handle Google OAuth callback
exports.googleCallback = async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const { email, name, picture } = userInfo;

    // 👉 Here: Save user to DB if not exists
    let user = await db.User.findOne({ email });
    if (!user) user = await db.User.create({ email, name, picture });

    // Issue JWT
    const token = jwt.sign({ email, name }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend with JWT
    res.redirect(`${process.env.FRONTEND_REDIRECT}?token=${token}`);
  } catch (error) {
    console.error("Google Auth Error", error);
    res.status(500).send("Authentication Failed");
  }
};

exports.getAllUsers = async (req, res) => {
  const { email, role } = req.user;

  if (role === "admin") {
    try {
      const users = await db.User.findAll({
        attributes: ["email", "username"],
      });
      res.status(200).send({ success: true, users });
    } catch (error) {
      res.status(500).send({ success: false, error: "Server error" });
    }
  } else {
    return res.status(403).send({ success: false, error: "Access denied" });
  }
};
