const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many registration attempts.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});

// REGISTER
router.post(
  '/register',
  registerLimiter,
  [
    body('companyName').trim().notEmpty(),
    body('gstNumber').trim().notEmpty(),
    body('email').trim().normalizeEmail().isEmail(),
  ],
  authController.register
);

// LOGIN
router.post(
  '/login',
  loginLimiter,
  [
    body('companyCode').trim().notEmpty(),
    body('username').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  authController.login
);

// CHANGE PASSWORD
router.post('/change-password', protect, authController.changePassword);

// GET ME
router.get('/me', protect, authController.getMe);

module.exports = router;