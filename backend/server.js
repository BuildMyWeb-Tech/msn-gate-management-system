require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const app  = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ── CORS ──────────────────────────────────────────────────────
const getAllowedOrigins = () => {
  const list = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
  ];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL.trim());
  return list;
};
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (getAllowedOrigins().includes(origin)) return cb(null, true);
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","userid","companyid","companycode","gateid","devicetype"],
  optionsSuccessStatus: 200,
}));

// ── Rate limit ────────────────────────────────────────────────
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// ── Body parsing — MUST be before ALL routes ──────────────────
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Health ────────────────────────────────────────────────────
app.get("/health", (_, res) =>
  res.json({ success:true, status:"healthy", service:"MSN Gate Management API", ts:new Date().toISOString() })
);

// ── Routes ────────────────────────────────────────────────────
app.use("/api/debug",        require("./routes/debugRoute"));
app.use("/api/auth",         require("./routes/authRoutes"));
app.use("/api/visitors",     require("./routes/visitorRoutes"));
app.use("/api/vehicles",     require("./routes/vehicleRoutes"));
app.use("/api/setup",        require("./routes/setupRoutes"));
app.use("/api/patrol",       require("./routes/patrolRoutes"));
app.use("/api/users",        require("./routes/userRoutes"));
app.use("/api/photos",       require("./routes/photoRoutes"));
app.use("/api/comp-vehicles",require("./routes/compVehicleRoutes"));

// ── Error Handlers ────────────────────────────────────────────
const { notFound, errorHandler } = require("./middleware/authMiddleware");
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🛡️  MSN Gate Management API → port ${PORT} [${process.env.NODE_ENV || "dev"}]\n`);
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000); });
process.on("unhandledRejection", (e) => { console.error("Unhandled rejection:", e); server.close(() => process.exit(1)); });

module.exports = app;