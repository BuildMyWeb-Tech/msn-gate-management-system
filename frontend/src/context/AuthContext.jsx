import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "gms-auth";

export function AuthProvider({ children }) {
  const [user, setUser]              = useState(null);
  const [isAuthenticated, setIsAuth] = useState(false);
  const [isLoading, setIsLoading]    = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) { const p = JSON.parse(stored); setUser(p); setIsAuth(true); }
    } catch { localStorage.removeItem(STORAGE_KEY); }
    finally { setIsLoading(false); }
  }, []);

  const login = useCallback((data) => {
    const userData = {
      token:       data.token,
      userId:      data.userId,
      companyId:   data.companyId,
      userName:    data.userName,
      gateId:      data.gateId    || null,
      gateName:    data.gateName  || null,
      loginType:   data.loginType || "desktop",
      // Mobile menus from PR_GetApp_UserMenus — baked into login response
      mobileMenus: data.menus    || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    setIsAuth(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setIsAuth(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoading, login, logout,
      isMobileUser: user?.loginType === "mobile",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
