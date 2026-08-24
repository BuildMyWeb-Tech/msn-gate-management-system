import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const MenuContext = createContext(null);

// Exact SubMenuName values from PR_Get_UserMenus (lowercase)
export const ROUTE_MAP = {
  "gate":             "/setup/gates",
  "securities":       "/setup/securities",
  "designation":      "/setup/designations",
  "comp. vehicles":   "/setup/cop-vehicles",
  "patrol points":    "/setup/patrol-points",
  "patrol plan":      "/setup/patrol-plan",
  "patrol route":     "/setup/patrol-plan",      // renamed alias
  "patrol schedule":  "/setup/patrol-schedule",
  "visitors":         "/visitors",
  "vehicles list":    "/vehicles",
  "patrols":          "/patrol",
  "users":            "/users",
};

export const LABEL_MAP = {
  "gate":            "Gates",
  "designation":     "Designations",
  "comp. vehicles":  "Comp. Vehicles",
  "patrol points":   "Patrol Points",
  "patrol plan":     "Patrol Plan",
  "patrol route":    "Patrol Route",
  "patrol schedule": "Patrol Schedule",
  "vehicles list":   "Vehicles",
  "patrols":         "Security Patrol",
};

// Mobile menus from PR_GetApp_UserMenus
export const MOBILE_MENU_ROUTES = {
  "visitors":        "/visitors",
  "vehicles":        "/vehicles",
  "security patrol": "/patrol",
};

export function MenuProvider({ children }) {
  const { user, isAuthenticated, isLoading: authLoading, isMobileUser } = useAuth();
  const [menus, setMenus]     = useState([]);
  const [loading, setLoading] = useState(() => {
    try {
      const stored = localStorage.getItem("gms-auth");
      if (stored) {
        const p = JSON.parse(stored);
        // Mobile security users get menus from login — no fetch needed
        if (p?.loginType === "mobile") return false;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    if (authLoading) return;

    // Mobile security guard: menus baked into login response
    if (isMobileUser) {
      setLoading(false);
      return;
    }

    // Not authenticated
    if (!isAuthenticated || !user?.userId) {
      setMenus([]);
      setLoading(false);
      return;
    }

    // Desktop user (or admin on mobile using desktop SP)
    // Fetch sidebar menus via PR_Get_UserMenus
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