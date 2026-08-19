import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const MenuContext = createContext(null);

// ── Dynamic route mapping ─────────────────────────────────────
// Exact SubMenuName values from PR_Get_UserMenus SP (lowercase for matching)
// Format: "submenuname from sp" : "route path"
// Exact SubMenuName values from PR_Get_UserMenus (lowercase for matching)
const ROUTE_MAP = {
  // Setup — menumuid:1
  "gate":             "/setup/gates",
  "securities":       "/setup/securities",
  "designation":      "/setup/designations",
  "comp. vehicles":   "/setup/cop-vehicles",    // menudid:7
  "patrol points":    "/setup/patrol-points",   // menudid:4
  "patrol plan":      "/setup/patrol-plan",     // menudid:12
  "patrol schedule":  "/setup/patrol-schedule", // menudid:13
  // Visitors — menumuid:2
  "visitors":         "/visitors",              // menudid:5
  // Vehicles — menumuid:3
  "vehicles list":    "/vehicles",              // menudid:8
  // Security Patrol — menumuid:4
  "patrols":          "/patrol",                // menudid:11
  // User Management — menumuid:5
  "users":            "/users",                 // menudid:10
};

// Display label overrides
const LABEL_MAP = {
  "gate":             "Gates",
  "designation":      "Designations",
  "comp. vehicles":   "Comp. Vehicles",
  "patrol points":    "Patrol Points",
  "patrol plan":      "Patrol Plan",
  "patrol schedule":  "Patrol Schedule",
  "vehicles list":    "Vehicles",
  "patrols":          "Security Patrol",
};

export { ROUTE_MAP, LABEL_MAP };

export function MenuProvider({ children }) {
  const { user, isAuthenticated, isLoading: authLoading, isMobileUser } = useAuth();
  const [menus, setMenus]     = useState([]);
  const [rawMenus, setRawMenus] = useState([]); // raw SP data
  const [loading, setLoading] = useState(() => {
    try {
      const stored = localStorage.getItem("gms-auth");
      if (stored) {
        const p = JSON.parse(stored);
        if (p?.loginType === "mobile") return false;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    if (authLoading) return;
    if (isMobileUser) { setLoading(false); return; }
    if (!isAuthenticated || !user?.userId) { setMenus([]); setRawMenus([]); setLoading(false); return; }

    setLoading(true);
    // Use PR_Get_UserMenus via /users/sidebar/:userId
    api.get(`/users/sidebar/${user.userId}`)
      .then(r => {
        const data = r.data?.data || [];
        setMenus(data);
        setRawMenus(data);
      })
      .catch(() => { setMenus([]); setRawMenus([]); })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, user?.userId, isMobileUser]);

  return (
    <MenuContext.Provider value={{ menus, rawMenus, loading }}>
      {children}
    </MenuContext.Provider>
  );
}

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
};