// routes/authRoutes.js
const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/authController");
const rateLimit  = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many login attempts. Try again later." },
});

// POST /api/auth/login
router.post("/login", loginLimiter, controller.login);

// GET /api/auth/gates?companyCode=1
router.get("/gates", controller.getGates);

module.exports = router;
