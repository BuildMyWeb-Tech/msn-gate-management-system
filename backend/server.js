require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const setupRoutes = require("./routes/setupRoutes");
const patrolRoutes = require("./routes/patrolRoutes");
const userRoutes = require("./routes/userRoutes");

const { notFound, errorHandler } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// ===========================
// Security
// ===========================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ===========================
// CORS
// ===========================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
  "https://msn-gate-management-system.vercel.app",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}

app.use(
  cors({
    origin(origin, callback) {
      // Postman / Mobile Apps
      if (!origin) return callback(null, true);

      // localhost & configured urls
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow every vercel preview deployment
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Origin",
      "Content-Type",
      "Accept",
      "Authorization",

      "userid",
      "companyid",
      "companycode",
      "gateid",
      "token",

      "X-Requested-With",
    ],

    exposedHeaders: ["Authorization"],
  })
);

// Handle OPTIONS requests
app.options("*", cors());

// ===========================
// Rate Limiter
// ===========================

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
  })
);

// ===========================
// Body Parser
// ===========================

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ===========================
// Logging
// ===========================

if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan(
      process.env.NODE_ENV === "production"
        ? "combined"
        : "dev"
    )
  );
}

// ===========================
// Health
// ===========================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "MSN Gate Management API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ===========================
// API Routes
// ===========================

app.use("/api/auth", authRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/patrol", patrolRoutes);
app.use("/api/users", userRoutes);

// ===========================
// Error Handlers
// ===========================

app.use(notFound);
app.use(errorHandler);

// ===========================
// Start Server
// ===========================

const server = app.listen(PORT, () => {
  console.log(
    `🚀 MSN Gate Management API running on port ${PORT}`
  );
});

// ===========================
// Graceful Shutdown
// ===========================

function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);

  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (err) => {
  console.error(err);
});

module.exports = app;