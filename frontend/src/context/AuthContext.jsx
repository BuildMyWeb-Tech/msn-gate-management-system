// src/context/AuthContext.jsx
// Stores userId, username, and a permissionMap built from the menu API
// permissionMap: { "Department": { mWrite:1, mUpdate:0, mDelete:1 }, ... }

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredUser, logout as logoutSvc, getMenus } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
const [state, setState] = useState({
  isAuthenticated:  false,
  isLoading:        true,
  userId:           null,
  username:         null,
  permissionMap:    {},
  menuGroups:       [],   // ← add this
});

  // Build permissionMap from grouped menus response
  const buildPermissionMap = (menuGroups) => {
    const map = {};
    for (const group of menuGroups) {
      for (const sub of group.subMenus || []) {
        map[sub.name] = {
          mWrite:  Number(sub.mWrite  ?? 1),
          mUpdate: Number(sub.mUpdate ?? 1),
          mDelete: Number(sub.mDelete ?? 1),
        };
      }
    }
    return map;
  };

  // Load permissions after login
const loadPermissions = useCallback(async (userId) => {
  try {
    const res = await getMenus(userId);
    if (res.success) {
      const map = buildPermissionMap(res.data);
      setState(p => ({ ...p, permissionMap: map, menuGroups: res.data })); // ← add menuGroups
    }
  } catch (err) {
    console.warn('Could not load permissions:', err.message);
  }
}, []);

  // Hydrate from localStorage on mount
 useEffect(() => {
  const stored = getStoredUser();

  if (stored?.userId) {
   setState({
  isAuthenticated: true,
  isLoading: false,
  userId: stored.userId,
  username: stored.username,
  permissionMap: {},
  menuGroups: [],   // ← add this
});

    loadPermissions(stored.userId); // ✅ only once
  } else {
    setState(p => ({ ...p, isLoading: false }));
  }
}, []); // ✅ KEEP EMPTY ARRAY

  const login = useCallback(async ({ userId, username }) => {
    setState({
  isAuthenticated: true,
  isLoading:       false,
  userId,
  username,
  permissionMap:   {},
  menuGroups:      [],   // ← add this
});
    // Load permissions immediately after login
    await loadPermissions(userId);
  }, [loadPermissions]);

  const logout = useCallback(() => {
    logoutSvc();
    setState({ isAuthenticated: false, isLoading: false, userId: null, username: null, permissionMap: {}, menuGroups: [] });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

// Convenience hook — returns permissions for a given menu name
// Usage: const { canAdd, canEdit, canDelete } = usePermissions("Department")
export const usePermissions = (menuName) => {
  const { permissionMap } = useAuth();
  const perm = permissionMap[menuName];

  return {
    canAdd:    perm ? perm.mWrite  === 1 : true,  // default allow if not loaded yet
    canEdit:   perm ? perm.mUpdate === 1 : true,
    canDelete: perm ? perm.mDelete === 1 : true,
    loaded:    !!perm,
  };
};