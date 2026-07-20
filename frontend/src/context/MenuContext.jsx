// context/MenuContext.jsx
// Loads user menus from SP after login
// Provides:
//   menus       — raw flat list from SP
//   canAccess(subMenuName) — true if user has this menu
//   getPerms(subMenuName)  — { mRead, mWrite, mUpdate, mDelete, mPrint }

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const MenuContext = createContext(null);

// Map SP SubMenuName → frontend route path
// Based on debug response column values
export const MENU_ROUTE_MAP = {
  "Gate":         "/setup/gates",
  "Securities":   "/setup/securities",
  "Designation":  "/setup/designations",
  "Locations":    "/setup/locations",
  "Visitor List": "/visitors",
  "Vehicles List":"/vehicles",
  "Patrols":      "/patrol",
  "Users":        "/users",
  // "Vehicles" under Setup menuname — skip (not a standalone page)
  // "Reports" — skip (not implemented)
};

export function MenuProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [menus, setMenus]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  const loadMenus = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/users/sidebar/${user.userId}`);
      setMenus(res.data?.data || []);
    } catch {
      setMenus([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      loadMenus();
    } else {
      setMenus([]);
      setLoaded(false);
    }
  }, [isAuthenticated, user?.userId, loadMenus]);

  // Check if user has access to a SubMenuName
  const canAccess = (subMenuName) => {
    if (!subMenuName) return false;
    return menus.some(m => m.subMenuName === subMenuName && m.mRead);
  };

  // Get CRUD permissions for a SubMenuName
  const getPerms = (subMenuName) => {
    const m = menus.find(m => m.subMenuName === subMenuName);
    if (!m) return { mRead:0, mWrite:0, mUpdate:0, mDelete:0, mPrint:0 };
    return {
      mRead:   m.mRead   ?? 0,
      mWrite:  m.mWrite  ?? 0,
      mUpdate: m.mUpdate ?? 0,
      mDelete: m.mDelete ?? 0,
      mPrint:  m.mPrint  ?? 0,
    };
  };

  // Get route-based permissions — used by pages
  const getPermsByRoute = (path) => {
    const entry = Object.entries(MENU_ROUTE_MAP).find(([, route]) =>
      path === route || path.startsWith(route + "/")
    );
    if (!entry) return { mRead:1, mWrite:1, mUpdate:1, mDelete:1, mPrint:1 };
    return getPerms(entry[0]);
  };

  return (
    <MenuContext.Provider value={{
      menus, loading, loaded,
      canAccess, getPerms, getPermsByRoute,
      reload: loadMenus,
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export const useMenu = () => useContext(MenuContext);