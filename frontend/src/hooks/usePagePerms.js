import { useLocation } from "react-router-dom";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";

const ROUTE_MENU_MAP = {
  "/setup/gates":        "Gate",
  "/setup/securities":   "Securities",
  "/setup/designations": "Designation",
  "/setup/locations":    "Locations",
  "/visitors":           "Visitor List",
  "/vehicles":           "Vehicles List",
  "/patrol":             "Patrols",
  "/users":              "Users",
};

export function usePagePerms() {
  const { menus } = useMenu();
  const { isMobileUser } = useAuth();
  const location = useLocation();
  if (isMobileUser) return { canRead:true, canWrite:true, canUpdate:true, canDelete:true, canPrint:true };
  const menuName = ROUTE_MENU_MAP[location.pathname];
  if (!menuName) return { canRead:true, canWrite:true, canUpdate:true, canDelete:true, canPrint:true };
  const menu = menus.find(m => m.subMenuName === menuName || m.menuname === menuName);
  if (!menu) return { canRead:false, canWrite:false, canUpdate:false, canDelete:false, canPrint:false };
  return {
    canRead:   Boolean(menu.mRead   ?? menu.MRead   ?? 1),
    canWrite:  Boolean(menu.mWrite  ?? menu.MWrite  ?? 1),
    canUpdate: Boolean(menu.mUpdate ?? menu.MUpdate ?? 1),
    canDelete: Boolean(menu.mDelete ?? menu.MDelete ?? 1),
    canPrint:  Boolean(menu.mPrint  ?? menu.MPrint  ?? 1),
  };
}