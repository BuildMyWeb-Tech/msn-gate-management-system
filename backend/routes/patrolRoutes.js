const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");

// Placeholder — patrol SP details pending from manager
router.get("/", gmsProtect, (req, res) => {
  res.json({ success:true, data:[], message:"Patrol module coming soon" });
});

module.exports = router;