import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const MenuContext = createContext(null);

export const MENU_ROUTE_MAP = {
  "Gate":          "/setup/gates",
  "Securities":    "/setup/securities",
  "Designation":   "/setup/designations",
  "Locations":     "/setup/locations",
  "Visitor List":  "/visitors",
  "Vehicles List": "/vehicles",
  "Patrols":       "/patrol",
  "Users":         "/users",
};

export function MenuProvider({ children }) {
  const { user, isAuthenticated, isLoading: authLoading, isMobileUser } = useAuth();
  const [menus, setMenus]     = useState([]);
  // Key fix: mobile users never need to load menus from API
  // Start as false for mobile, true only for desktop (needs API call)
  const [loading, setLoading] = useState(() => {
    try {
      const stored = localStorage.getItem("gms-auth");
      if (stored) {
        const p = JSON.parse(stored);
        // If stored user is mobile — no loading needed
        if (p?.loginType === "mobile") return false;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    // Wait for auth to finish resolving from localStorage
    if (authLoading) return;

    // Mobile users: menus come from login response stored in user.mobileMenus
    // No API call needed — set loading false immediately
    if (isMobileUser) {
      setLoading(false);
      return;
    }

    // Not authenticated — clear and stop loading
    if (!isAuthenticated || !user?.userId) {
      setMenus([]);
      setLoading(false);
      return;
    }

    // Desktop: fetch sidebar menus from server
    setLoading(true);
    api.get(`/users/sidebar/${user.userId}`)
      .then(r => setMenus(r.data?.data || []))
      .catch(() => setMenus([]))
      .finally(() => setLoading(false));

  }, [authLoading, isAuthenticated, user?.userId, isMobileUser]);

  return (
    <MenuContext.Provider value={{ menus, loading }}>
      {children}
    </MenuContext.Provider>
  );
}

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
};