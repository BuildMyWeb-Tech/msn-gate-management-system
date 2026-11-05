const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/authController");

router.post("/login",        ctrl.login);                   // Desktop login
router.post("/mobile-login", ctrl.mobileLogin);            // Mobile/security login
router.get("/gates",         ctrl.getGates);               // Gate list for login dropdown
router.get("/company",       ctrl.getCompanyByShortname);  // Company lookup by shortname

module.exports = router;
