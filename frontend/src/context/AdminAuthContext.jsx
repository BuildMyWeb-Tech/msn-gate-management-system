// src/context/AdminAuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredAdmin, adminLogout } from '../services/adminService';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [state, setState] = useState({
    isAuthenticated: false,
    isLoading: true,
    admin: null,
    token: null,
  });

  useEffect(() => {
    const stored = getStoredAdmin();
    const token  = localStorage.getItem('pmb_admin_token');
    if (stored && token) {
      setState({ isAuthenticated: true, isLoading: false, admin: stored, token });
    } else {
      setState(p => ({ ...p, isLoading: false }));
    }
  }, []);

  const login = useCallback((data) => {
    setState({ isAuthenticated: true, isLoading: false, admin: data.admin, token: data.token });
  }, []);

  const logout = useCallback(() => {
    adminLogout();
    setState({ isAuthenticated: false, isLoading: false, admin: null, token: null });
  }, []);

  return (
    <AdminAuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return ctx;
};