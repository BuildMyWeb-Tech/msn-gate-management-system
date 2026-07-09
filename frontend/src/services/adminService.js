// src/services/adminService.js
import axios from 'axios';

const ADMIN_BASE = (import.meta.env.VITE_API_URL || '/api') + '/admin';

const adminApi = axios.create({
  baseURL: ADMIN_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('pmb_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && err.config?.url !== '/auth/login') {
       console.warn("Unauthorized API call");
    }
    return Promise.reject(err);
  }
);

export const adminLogin       = async (d)  => { const r = await adminApi.post('/auth/login', d); if (r.data.success) { localStorage.setItem('pmb_admin_token', r.data.data.token); localStorage.setItem('pmb_admin', JSON.stringify(r.data.data.admin)); } return r.data; };
export const adminLogout      = ()         => { localStorage.removeItem('pmb_admin_token'); localStorage.removeItem('pmb_admin'); };
export const getAdminMe       = async ()   => (await adminApi.get('/me')).data;
export const getStats         = async ()   => (await adminApi.get('/stats')).data;
export const getCompanies     = async (p)  => (await adminApi.get('/companies', { params: p })).data;
export const getCompanyById   = async (id) => (await adminApi.get(`/companies/${id}`)).data;
export const approveCompany   = async (id, note = '') => (await adminApi.post(`/companies/${id}/approve`, { note })).data;
export const rejectCompany    = async (id, reason='') => (await adminApi.post(`/companies/${id}/reject`,  { reason })).data;
export const resendCredentials = async (id) => (await adminApi.post(`/companies/${id}/resend-credentials`)).data;
export const getStoredAdmin   = () => { try { const r = localStorage.getItem('pmb_admin'); const t = localStorage.getItem('pmb_admin_token'); if (!r||!t) return null; return JSON.parse(r); } catch { return null; } };

export default adminApi;