import api from "./api";

/**
 * Upload any photo to Cloudinary via backend
 * @param {string} base64     - raw base64 (no data: prefix)
 * @param {string} type       - "visitor" | "security" | "vehicle" | "any"
 * @param {string|number} id  - record ID for naming
 * @param {string} folder     - custom folder (only for "any" type)
 */
async function uploadPhoto(base64, type = "visitor", id = null, folder = null) {
  const endpoint = type === "security" ? "/photos/security"
                 : type === "vehicle"  ? "/photos/vehicle"
                 : type === "any"      ? "/photos/any"
                 : "/photos/upload";

  const body = { photo: base64, id: id ? String(id) : null };
  if (folder) body.folder = folder;

  const res = await api.post(endpoint, body);
  if (!res.data?.success || !res.data?.url) {
    throw new Error(res.data?.message || "Photo upload failed");
  }
  return res.data.url;
}

// Specific helpers
export const uploadVisitorPhoto  = (b64, id) => uploadPhoto(b64, "visitor",  id);
export const uploadSecurityPhoto = (b64, id) => uploadPhoto(b64, "security", id);
export const uploadVehiclePhoto  = (b64, id) => uploadPhoto(b64, "vehicle",  id);

// Generic — specify folder
export const uploadAnyPhoto = (b64, id, folder) => uploadPhoto(b64, "any", id, folder);

export default uploadPhoto;
