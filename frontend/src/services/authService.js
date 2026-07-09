// src/services/authService.js
// ERP-style auth (SQL Server based, no JWT)

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});


// 🔥 ADD userid HEADER FOR ALL REQUESTS
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('mpm_user');

    if (stored) {
      const user = JSON.parse(stored);

      if (user?.userId) {
        config.headers["userid"] = user.userId; // ✅ REQUIRED FOR BACKEND
      }
    }
  } catch (err) {
    console.warn("Invalid user in storage");
  }

  return config;
});


// 🔥 HANDLE API ERRORS (NO AUTO REDIRECT)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized API call - check userId header");
      // ❌ DO NOT redirect
    }
    return Promise.reject(error);
  }
);



// 🔐 LOGIN
export const loginUser = async ({ username, password }) => {
  const res = await api.post('/auth/login', { username, password });

  if (res.data.success) {
    const userId = res.data.data.userId;

    // ✅ STORE USER
    localStorage.setItem(
      'mpm_user',
      JSON.stringify({ userId, username })
    );
  }

  return res.data;
};


// 🚪 LOGOUT
export const logout = () => {
  localStorage.removeItem('mpm_user');
};


// 👤 GET STORED USER
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('mpm_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};


// 📋 GET MENUS
export const getMenus = async (userId) => {
  const res = await api.get(`/menus/grouped/${userId}`);
  return res.data;
};


// 📊 GET DASHBOARD
export const getDashboard = async (userId) => {
  const res = await api.get(`/dashboard/${userId}`);
  return res.data;
};


export default api;