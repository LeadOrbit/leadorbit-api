const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const sequelize = require("./config/db.config.js");

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// View engine and static files
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);

// Middleware
app.use(
  cors({
    origin: ["https://leadnexis.vercel.app/", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routers
const mainRouter = require("./routes");
const uiRouter = require("./ui_routes");
const { startCampaignScheduler } = require("./services/schedular.js");

// Logger middleware
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

// UI & API routes
app.use("/", uiRouter);
app.use("/api/v1", mainRouter);

// Start server & DB
let server = null;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Only sync without altering in production
    await sequelize.sync({
      // alter: process.env.NODE_ENV !== 'production',
      // You can enable the line below for dev only (NOT recommended in production)
      alter: true,
      logging: false,
    });
    console.log("✅ All models synchronized successfully");

    if (process.env.ENABLE_JOBS === "true") {
      require("./crons/index")();
      console.log("✅ Cron jobs initialized");
    }

    server = app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      startCampaignScheduler();
    });

    return { app, server };
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

// Fallback 404 page
app.use((req, res) => {
  res.status(404).render("404_page");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

startServer();

module.exports = { app, server, startServer };
