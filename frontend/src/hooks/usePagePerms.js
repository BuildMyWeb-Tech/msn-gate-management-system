import { useLocation } from "react-router-dom";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";

// Route → SubMenuName (lowercase) for permission lookup
const ROUTE_MENU_MAP = {
  "/setup/gates":          "gate",
  "/setup/securities":     "securities",
  "/setup/designations":   "designation",
  "/setup/patrol-points":  "patrol points",
  "/setup/cop-vehicles":   "comp. vehicles",
  "/setup/patrol-plan":    "patrol plan",
  "/visitors":             "visitors",
  "/vehicles":             "vehicles list",
  "/patrol":               "patrols",
  "/reports":              "reports",
  "/users":                "users",
};

export function usePagePerms() {
  const { menus } = useMenu();
  const { isMobileUser } = useAuth();
  const location = useLocation();

  // Mobile security guards have full access to their allowed pages
  if (isMobileUser) return { canRead:true, canWrite:true, canUpdate:true, canDelete:true, canPrint:true };

  const menuKey = ROUTE_MENU_MAP[location.pathname];
  if (!menuKey) return { canRead:true, canWrite:true, canUpdate:true, canDelete:true, canPrint:true };

  const menu = menus.find(m => {
    const sub = (m.subMenuName || m.SubMenuName || "").toLowerCase().trim();
    return sub === menuKey;
  });

  if (!menu) return { canRead:false, canWrite:false, canUpdate:false, canDelete:false, canPrint:false };

  return {
    canRead:   Boolean(menu.mRead   ?? menu.MRead   ?? 1),
    canWrite:  Boolean(menu.mWrite  ?? menu.MWrite  ?? 1),
    canUpdate: Boolean(menu.mUpdate ?? menu.MUpdate ?? 1),
    canDelete: Boolean(menu.mDelete ?? menu.MDelete ?? 1),
    canPrint:  Boolean(menu.mPrint  ?? menu.MPrint  ?? 1),
  };
}