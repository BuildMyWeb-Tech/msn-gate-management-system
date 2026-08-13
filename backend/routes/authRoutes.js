const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/authController");

router.post("/login",        ctrl.login);        // Desktop login
router.post("/mobile-login", ctrl.mobileLogin);  // Mobile/security login
router.get("/gates",         ctrl.getGates);     // Gate list for login dropdown

module.exports = router;
