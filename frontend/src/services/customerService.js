// frontend/src/services/customerService.js
import api from "./authService"; // reuse same Axios instance (userid header auto-injected)

// 🔹 GET CUSTOMERS GRID
export const getCustomers = async (active = 1) => {
  const res = await api.get(`/customers?active=${active}`);
  return res.data;
};

// 🔹 GET SINGLE CUSTOMER (for edit form)
export const getCustomerById = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};

// 🔹 CREATE CUSTOMER
export const createCustomer = async (data) => {
  const res = await api.post("/customers", data);
  return res.data;
};

// 🔹 UPDATE CUSTOMER
export const updateCustomer = async (id, data) => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data;
};

// 🔹 DELETE CUSTOMER (soft — sets Active = 0 via SP)
export const deleteCustomer = async (id) => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};

// 🔹 RESTORE CUSTOMER (undelete — sets Active = 1 via SP)  ← NEW
export const restoreCustomer = async (id) => {
  const res = await api.patch(`/customers/${id}/restore`);
  return res.data;
};