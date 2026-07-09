require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes  = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const menuRoutes = require("./routes/menuRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const generalMasterRoutes = require("./routes/generalMasterRoutes");
const userRoutes = require("./routes/userRoutes");
const customerRoutes = require("./routes/customerRoutes");
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { verifyEmailConnection }  = require('./services/emailService');

const app  = express();
const PORT = process.env.PORT || 5000;


// Trust proxy — required for Render / AWS load balancers
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Dynamic CORS — reads from env vars
const getAllowedOrigins = () => {
  const list = ['http://localhost:5173', 'http://localhost:3000','https://saas-platform-lyart.vercel.app'];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL.trim());
  if (process.env.EXTRA_ORIGINS)
    process.env.EXTRA_ORIGINS.split(',').forEach(o => list.push(o.trim()));
  return list;
};

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin)) return cb(null, true);

    if (getAllowedOrigins().includes(origin)) return cb(null, true);

    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'userid'], // 🔥 FIXED
}));

app.use(rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check — Render uses this for zero-downtime deploys
app.get('/health', (_, res) => res.json({
  success: true, status: 'healthy',
  service: 'PrintMixBox API', env: process.env.NODE_ENV, ts: new Date().toISOString(),
}));

app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/general", generalMasterRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  console.log(`\n🖨️  PrintMixBox API → port ${PORT} [${process.env.NODE_ENV || 'dev'}]\n`);
  await verifyEmailConnection();
});

const shutdown = (sig) => {
  console.log(`${sig} — closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => { console.error(e); server.close(() => process.exit(1)); });

module.exports = app;