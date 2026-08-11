import api from "./api";

/**
 * Upload base64 photo to Cloudinary via backend
 * @param {string} base64 - raw base64 string (no data: prefix)
 * @param {string|number} visitorId - optional visitor ID for naming
 * @returns {Promise<string>} - Cloudinary URL
 */
export async function uploadVisitorPhoto(base64, visitorId = null) {
  const res = await api.post("/photos/upload", {
    photo:     base64,
    visitorId: visitorId ? String(visitorId) : null,
  });
  if (!res.data?.success || !res.data?.url) {
    throw new Error(res.data?.message || "Photo upload failed");
  }
  return res.data.url;
}