// routes/patrolRoutes.js
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/patrolController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

router.get("/",  ctrl.getLogs);
router.post("/", ctrl.markCheckpoint);

module.exports = router;
