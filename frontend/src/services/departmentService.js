// src/services/departmentService.js
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

// Attach userId header + Authorization from session
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('mpm_user');
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user?.userId) {
        config.headers['userid'] = user.userId;
        config.headers['Authorization'] = `Bearer session_${user.userId}`;
      }
    } catch {}
  }
  return config;
});

/** GET /api/departments — list all departments */
export const fetchDepartments = async () => {
  const res = await api.get('/departments');
  return res.data; // { success, data: [{id, code, name, shortName}] }
};

/** POST /api/departments — insert (mode 1) */
export const createDepartment = async ({ code, name, shortName, userId }) => {
  const res = await api.post('/departments', {
    mode:      1,
    userId,
    code,
    name,
    shortName,
    uid:       0,
  });
  return res.data;
};

/** PUT /api/departments/:id — update (mode 2) */
export const updateDepartment = async ({ id, code, name, shortName, userId }) => {
  const res = await api.put(`/departments/${id}`, {
    mode:      2,
    userId,
    code,
    name,
    shortName,
    uid:       id,
  });
  return res.data;
};

/** DELETE /api/departments/:id — delete (mode 3) */
export const deleteDepartment = async ({ id }) => {
  const res = await api.delete(`/departments/${id}`);
  return res.data;
};