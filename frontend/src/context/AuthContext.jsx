import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "gms-auth";

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < (Date.now() - 30000);
  } catch { return false; }
}

function getTokenTTL(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.exp * 1000) - Date.now();
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser]              = useState(null);
  const [isAuthenticated, setIsAuth] = useState(false);
  const [isLoading, setIsLoading]    = useState(true);

  useEffect(() => {
    let timer;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.token) {
          localStorage.removeItem(STORAGE_KEY);
        } else if (isTokenExpired(parsed.token)) {
          console.log("[Auth] Token expired — clearing session");
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setUser(parsed);
          setIsAuth(true);
          const ttl = getTokenTTL(parsed.token);
          if (ttl && ttl > 0) {
            timer = setTimeout(() => {
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
              setIsAuth(false);
              window.location.href = "/login";
            }, ttl);
          }
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
    return () => { if (timer) clearTimeout(timer); };
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
      mobileMenus: data.menus     || null,
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