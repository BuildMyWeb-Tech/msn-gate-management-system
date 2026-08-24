import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Request interceptor — attach auth headers
api.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem("gms-auth");
    if (stored) {
      const { token, userId, companyId, gateId, loginType } = JSON.parse(stored);
      if (token)     config.headers["Authorization"] = `Bearer ${token}`;
      if (userId)    config.headers["userid"]        = String(userId);
      if (companyId) config.headers["companyid"]     = String(companyId);
      config.headers["gateid"]     = String(gateId || 0);
      config.headers["devicetype"] = loginType === "mobile" ? "mobile" : "web";
    }
  } catch {}
  return config;
});

// Response interceptor — handle 401
// IMPORTANT: Only auto-logout on 401 for non-auth routes
// Do NOT logout on API failures like timeout or 500
api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url    = err.config?.url || "";

    // Only force logout on 401 (unauthorized) — not on 429, 500, timeouts
    if (status === 401) {
      // Don't logout if it's a login request failing
      const isAuthRequest = url.includes("/auth/login") ||
                            url.includes("/auth/mobile-login");
      if (!isAuthRequest) {
        console.warn("[api] 401 received — clearing session");
        localStorage.removeItem("gms-auth");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;