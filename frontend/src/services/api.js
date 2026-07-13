// services/api.js — shared Axios instance
// Sends companyid (Int from DB) in all protected API headers
// companyCode (VarChar "514670") is only used at login — NOT in headers

import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("gms_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.userId)    config.headers["userid"]    = u.userId;
      if (u?.companyId) config.headers["companyid"] = u.companyId;  // Int e.g. 1
      if (u?.gateId)    config.headers["gateid"]    = u.gateId;
    }
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
