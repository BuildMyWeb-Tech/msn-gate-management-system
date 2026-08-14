import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem("gms-auth");
    if (stored) {
      const { token, userId, companyId, gateId, loginType } = JSON.parse(stored);
      if (token)     config.headers["Authorization"] = `Bearer ${token}`;
      if (userId)    config.headers["userid"]        = String(userId);
      if (companyId) config.headers["companyid"]     = String(companyId);
      config.headers["gateid"]     = String(gateId || 0);
      // Send correct devicetype so backend knows mobile vs desktop
      config.headers["devicetype"] = loginType === "mobile" ? "mobile" : "web";
    }
  } catch {}
  return config;
});

// Response interceptor — if 401 on mobile, clear auth and redirect
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("gms-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;