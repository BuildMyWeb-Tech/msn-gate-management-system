const express = require('express');
const rateLimit = require('express-rate-limit');
const { adminProtect } = require('../middleware/authMiddleware');

const {
  adminLogin,
  getCompanies,
  getCompanyById,
  approveCompany,
  rejectCompany,
  resendCredentials,
  getStats,
  getAdminMe,
} = require('../controllers/adminController');

const router = express.Router();

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many admin login attempts.' },
});

// Public
router.post('/auth/login', adminLoginLimiter, adminLogin);

// Protected
router.use(adminProtect);

router.get('/me', getAdminMe);
router.get('/companies', getCompanies);
router.get('/companies/:id', getCompanyById);
router.post('/companies/:id/approve', approveCompany);
router.post('/companies/:id/reject', rejectCompany);
router.post('/companies/:id/resend-credentials', resendCredentials);

module.exports = router;