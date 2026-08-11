const express        = require("express");
const router         = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const { uploadPhoto } = require("../services/cloudinaryService");

// POST /api/photos/upload
router.post("/upload", gmsProtect, async (req, res, next) => {
  try {
    console.log("[uploadPhoto] req.body keys:", req.body ? Object.keys(req.body) : "UNDEFINED");

    const photo     = req.body?.photo;
    const visitorId = req.body?.visitorId;

    if (!photo) {
      return res.status(400).json({ success:false, message:"No photo provided" });
    }

    // Clean base64 — strip data URI prefix if present
    const base64 = photo.startsWith("data:image")
      ? photo.split(",")[1]
      : photo;

    if (!base64 || base64.length < 100) {
      return res.status(400).json({ success:false, message:"Invalid photo data — too short" });
    }

    const publicId = visitorId ? `visitor_${visitorId}_${Date.now()}` : `visitor_${Date.now()}`;

    console.log("[uploadPhoto] Uploading to Cloudinary, length:", base64.length, "publicId:", publicId);
    const url = await uploadPhoto(base64, "msn-gms/visitors", publicId);
    console.log("[uploadPhoto] Success:", url);

    res.json({ success:true, url });
  } catch (err) {
    console.error("[uploadPhoto] Error:", err.message);
    next(err);
  }
});

module.exports = router;