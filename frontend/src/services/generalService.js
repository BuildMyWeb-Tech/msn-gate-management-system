// frontend/src/services/generalService.js
// Single API: /api/general/:type  for all 5 setup modules
// Type map: 1=Department, 2=Designation, 3=Employees, 4=Machines, 5=Process

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, timeout: 20000 });

// Attach session headers on every request
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('mpm_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.userId) {
        config.headers['userid']        = user.userId;
        config.headers['Authorization'] = `Bearer session_${user.userId}`;
      }
    }
  } catch {}
  return config;
});

// Helper: get userId from localStorage
const getStoredUserId = () => {
  try {
    const raw = localStorage.getItem('mpm_user');
    return raw ? JSON.parse(raw)?.userId : null;
  } catch { return null; }
};

/** GET /api/general/:type?tag=1|0 */
export const fetchGeneral = async (type, tag = 1) => {
  const res = await api.get(`/general/${type}?tag=${tag}`);
  return res.data;
};

/** POST /api/general/:type */
export const createGeneral = async ({ type, code, name, shortName }) => {
  const res = await api.post(`/general/${type}`, { code, name, shortName });
  return res.data;
};

/** PUT /api/general/:type/:id */
export const updateGeneral = async ({ type, id, code, name, shortName }) => {
  const userId = getStoredUserId();
  const res = await api.put(`/general/${type}/${id}`, { userId, code, name, shortName });
  return res.data;
};

/** DELETE /api/general/:type/:id */
export const deleteGeneral = async ({ type, id }) => {
  const res = await api.delete(`/general/${type}/${id}`);
  return res.data;
};

/** PATCH /api/general/:type/:id/restore — undelete  ← NEW */
export const restoreGeneral = async ({ type, id }) => {
  const res = await api.patch(`/general/${type}/${id}/restore`);
  return res.data;
};