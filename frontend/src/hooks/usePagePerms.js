// hooks/usePagePerms.js
// Returns CRUD permissions for the current page
// Usage: const { canWrite, canUpdate, canDelete } = usePagePerms();

import { useLocation } from "react-router-dom";
import { useMenu } from "../context/MenuContext";

export function usePagePerms() {
  const location = useLocation();
  const { getPermsByRoute } = useMenu();
  const perms = getPermsByRoute(location.pathname);
  return {
    canRead:   Boolean(perms.mRead),
    canWrite:  Boolean(perms.mWrite),   // Create / Add New
    canUpdate: Boolean(perms.mUpdate),  // Edit
    canDelete: Boolean(perms.mDelete),  // Delete
    canPrint:  Boolean(perms.mPrint),
    raw: perms,
  };
}