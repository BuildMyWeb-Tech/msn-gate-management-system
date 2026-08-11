const cloudinary = require("cloudinary").v2;

// Configure from env — add to .env:
// CLOUDINARY_CLOUD_NAME=xxx
// CLOUDINARY_API_KEY=xxx
// CLOUDINARY_API_SECRET=xxx
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Data - raw base64 string (no data: prefix)
 * @param {string} folder     - Cloudinary folder e.g. "msn-gms/visitors"
 * @param {string} publicId   - optional public ID e.g. "visitor_21"
 * @returns {Promise<string>} - secure URL
 */
async function uploadPhoto(base64Data, folder = "msn-gms/visitors", publicId = null) {
  // Build data URI for Cloudinary upload
  const dataUri = `data:image/jpeg;base64,${base64Data}`;

  const options = {
    folder,
    resource_type: "image",
    format:        "jpg",
    quality:       "auto:good",
    fetch_format:  "auto",
    // Resize to max 800px width — reduces storage and load time
    transformation: [{ width: 800, height: 1000, crop: "limit" }],
  };
  if (publicId) options.public_id = publicId;

  const result = await cloudinary.uploader.upload(dataUri, options);
  return result.secure_url;
}

/**
 * Delete a photo by URL or public_id
 */
async function deletePhoto(urlOrPublicId) {
  try {
    // Extract public_id from URL if full URL passed
    let publicId = urlOrPublicId;
    if (urlOrPublicId.startsWith("http")) {
      // Extract: "msn-gms/visitors/visitor_21" from URL
      const matches = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      if (matches) publicId = matches[1];
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("[deletePhoto] Failed to delete from Cloudinary:", err.message);
  }
}

module.exports = { uploadPhoto, deletePhoto };