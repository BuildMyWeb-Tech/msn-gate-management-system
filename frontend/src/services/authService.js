import api from "./api";

export const loginUser     = (body)        => api.post("/auth/login",        body).then(r => r.data);
export const loginSecurity = (body)        => api.post("/auth/mobile-login", body).then(r => r.data);
export const getGates      = (companyCode) => api.get(`/auth/gates?companyCode=${companyCode}`).then(r => r.data);