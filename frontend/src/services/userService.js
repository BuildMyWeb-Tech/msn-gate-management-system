// frontend/src/services/userService.js
import api from "./authService"; // reuse the same Axios instance (userid header auto-injected)

// 🔹 GET USERS GRID
export const getUsers = async (tag = 1) => {
  const res = await api.get(`/users?tag=${tag}`);
  return res.data;
};

// 🔹 CREATE USER → returns { userId }
export const createUser = async ({ userName, pwd, active }) => {
  const res = await api.post("/users", { userName, pwd, active });
  return res.data;
};

// 🔹 UPDATE USER
export const updateUser = async (id, { userName, pwd, active }) => {
  const res = await api.put(`/users/${id}`, { userName, pwd, active });
  return res.data;
};

// 🔹 DELETE USER (soft)
export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

// 🔹 RESTORE USER (undelete)  ← NEW
export const restoreUser = async (id) => {
  const res = await api.patch(`/users/${id}/restore`);
  return res.data;
};

// 🔹 GET PERMISSIONS FOR A USER
export const getUserPermissions = async (userId) => {
  const res = await api.get(`/users/${userId}/permissions`);
  return res.data;
};

// 🔹 SAVE PERMISSIONS
export const saveUserPermissions = async (userId, permissions) => {
  const res = await api.post(`/users/${userId}/permissions`, { permissions });
  return res.data;
};