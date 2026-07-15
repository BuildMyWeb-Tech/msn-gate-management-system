// services/api.js
// Sends companyid (Int from DB) + devicetype header on every protected request
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

// Detect device type from screen width
// mobile < 768px, desktop >= 768px
const getDeviceType = () =>
  typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop";

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("gms_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.userId)    config.headers["userid"]     = u.userId;
      if (u?.companyId) config.headers["companyid"]  = u.companyId;
      if (u?.gateId)    config.headers["gateid"]     = u.gateId;
    }
    // Always send device type — SP or backend can use it if needed
    config.headers["devicetype"] = getDeviceType();
  } catch { /* ignore */ }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("gms_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;