const express        = require("express");
const router         = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const { uploadPhoto } = require("../services/cloudinaryService");

// Generic photo upload helper
async function handleUpload(req, res, next, folder, idPrefix) {
  try {
    console.log("[uploadPhoto] folder:", folder, "body keys:", req.body ? Object.keys(req.body) : "NONE");
    const { photo, id } = req.body || {};
    if (!photo) return res.status(400).json({ success:false, message:"No photo provided" });

    const base64 = photo.startsWith("data:image") ? photo.split(",")[1] : photo;
    if (!base64 || base64.length < 100) {
      return res.status(400).json({ success:false, message:"Invalid photo data" });
    }

    const publicId = id ? `${idPrefix}_${id}_${Date.now()}` : `${idPrefix}_${Date.now()}`;
    console.log("[uploadPhoto] Uploading to Cloudinary, length:", base64.length);
    const url = await uploadPhoto(base64, folder, publicId);
    console.log("[uploadPhoto] Success:", url);
    res.json({ success:true, url });
  } catch(err) {
    console.error("[uploadPhoto] Error:", err.message);
    next(err);
  }
}

// POST /api/photos/upload — visitor photo
router.post("/upload", gmsProtect, (req, res, next) =>
  handleUpload(req, res, next, "msn-gms/visitors", "visitor")
);

// POST /api/photos/security — security guard photo
router.post("/security", gmsProtect, (req, res, next) =>
  handleUpload(req, res, next, "msn-gms/security", "security")
);

// POST /api/photos/vehicle — vehicle photo (future)
router.post("/vehicle", gmsProtect, (req, res, next) =>
  handleUpload(req, res, next, "msn-gms/vehicles", "vehicle")
);

// Generic endpoint — pass folder in body
// POST /api/photos/any  { photo, id, folder:"msn-gms/custom" }
router.post("/any", gmsProtect, async (req, res, next) => {
  try {
    const { photo, id, folder = "msn-gms/general" } = req.body || {};
    if (!photo) return res.status(400).json({ success:false, message:"No photo provided" });
    const base64  = photo.startsWith("data:image") ? photo.split(",")[1] : photo;
    const publicId = id ? `img_${id}_${Date.now()}` : `img_${Date.now()}`;
    const url = await uploadPhoto(base64, folder, publicId);
    res.json({ success:true, url });
  } catch(err) { next(err); }
});

module.exports = router;
