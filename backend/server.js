require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const authRoutes    = require("./routes/authRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const setupRoutes   = require("./routes/setupRoutes");
const patrolRoutes  = require("./routes/patrolRoutes");
const userRoutes    = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/authMiddleware");

const app  = express();
const PORT = process.env.PORT || 5000;

// Trust proxy
app.set("trust proxy", 1);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS
const getAllowedOrigins = () => {
  const list = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://msn-gate-management-system.vercel.app/",
    "https://msn-gate-management-system.vercel.app"
  ];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL.trim());
  return list;
};

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (getAllowedOrigins().includes(origin)) return cb(null, true);
    // Allow any vercel.app subdomain
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "userid", "companycode", "gateid"],
}));

// Rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Body parsing
app.use(express.json({ limit: "20mb" }));  // 20mb for base64 photos
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Health Check ────────────────────────────────────────────
app.get("/health", (_, res) =>
  res.json({
    success: true,
    status:  "healthy",
    service: "MSN Gate Management API",
    env:     process.env.NODE_ENV,
    ts:      new Date().toISOString(),
  })
);

// ── Routes ─────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/setup",    setupRoutes);
app.use("/api/patrol",   patrolRoutes);
app.use("/api/users",    userRoutes);

// ── Error Handlers ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🛡️  MSN Gate Management API → port ${PORT} [${process.env.NODE_ENV || "dev"}]\n`);
});

// Graceful shutdown
const shutdown = (sig) => {
  console.log(`${sig} — closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("unhandledRejection", (e) => {
  console.error("Unhandled rejection:", e);
  server.close(() => process.exit(1));
});

module.exports = app;