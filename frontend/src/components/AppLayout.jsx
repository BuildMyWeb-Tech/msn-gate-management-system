import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMenu } from "../context/MenuContext";
import { useResponsive } from "../hooks/useResponsive";
import BottomNav from "./BottomNav";
import PWAInstall from "./PWAInstall";
import {
  Users, Car, Shield, UserCog, Menu, X,
  Building2, MapPin, BadgeCheck, Layers, LogOut,
  LayoutDashboard,
} from "lucide-react";

// Desktop sidebar menus — from PR_Get_UserMenus via MenuContext
const SUBMENU_CONFIG = {
  "Gate":         { Icon: Layers,     path: "/setup/gates" },
  "Securities":   { Icon: BadgeCheck, path: "/setup/securities" },
  "Designation":  { Icon: Building2,  path: "/setup/designations" },
  "Locations":    { Icon: MapPin,     path: "/setup/locations" },
  "Visitor List": { Icon: Users,      path: "/visitors" },
  "Vehicles List":{ Icon: Car,        path: "/vehicles" },
  "Patrols":      { Icon: Shield,     path: "/patrol" },
  "Users":        { Icon: UserCog,    path: "/users" },
};
const LABEL_MAP = {
  "Gate":"Gates","Designation":"Designations",
  "Visitor List":"Visitors","Vehicles List":"Vehicles",
  "Patrols":"Security Patrol","Users":"User Management",
};

// Mobile menus — from PR_GetApp_UserMenus (menumuid + menuname)
const MOBILE_MENU_CONFIG = {
  "Visitors":        { Icon: Users,  path: "/visitors" },
  "Vehicles":        { Icon: Car,    path: "/vehicles" },
  "Security Patrol": { Icon: Shield, path: "/patrol" },
};

const PAGE_LABELS = {
  "/dashboard":"Dashboard","/visitors":"Visitors",
  "/visitors/new":"New Visitor","/vehicles":"Vehicles",
  "/vehicles/new":"New Vehicle","/patrol":"Security Patrol",
  "/setup/gates":"Gates","/setup/securities":"Securities",
  "/setup/designations":"Designations","/setup/locations":"Locations",
  "/users":"User Management",
};

export default function AppLayout() {
  const { user, logout, isMobileUser } = useAuth();
  const { menus: desktopMenus, loading: menusLoading } = useMenu();
  const { isMobile } = useResponsive();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login", { replace:true }); };
  const close = () => setOpen(false);

  const currentLabel = (() => {
    const p = location.pathname;
    if (PAGE_LABELS[p]) return PAGE_LABELS[p];
    if (p.startsWith("/visitors/edit/"))  return "Edit Visitor";
    if (p.startsWith("/vehicles/edit/"))  return "Edit Vehicle";
    if (p.includes("/permissions"))       return "User Permissions";
    return "";
  })();

  const initials  = (user?.userName||"U").slice(0,2).toUpperCase();
  const gateLabel = user?.gateName || (user?.gateId ? `Gate ${user.gateId}` : null);

  // Build nav based on login type
  const buildNav = () => {
    const nav = [{ path:"/dashboard", label:"Dashboard", Icon:LayoutDashboard }];

    if (isMobileUser && user?.mobileMenus?.length) {
      // Mobile: use PR_GetApp_UserMenus result
      user.mobileMenus.forEach(m => {
        const cfg = MOBILE_MENU_CONFIG[m.menuname];
        if (cfg && !nav.find(n => n.path === cfg.path)) {
          nav.push({ path:cfg.path, label:m.menuname, Icon:cfg.Icon });
        }
      });
    } else {
      // Desktop: use PR_Get_UserMenus via MenuContext
      if (menusLoading || !desktopMenus.length) return nav;
      let lastGroup = null;
      desktopMenus.forEach(m => {
        const cfg = SUBMENU_CONFIG[m.subMenuName];
        if (!cfg) return;
        const group = m.menuname;
        if (group !== lastGroup) { nav.push({ section:group }); lastGroup = group; }
        if (!nav.find(n => n.path === cfg.path))
          nav.push({ path:cfg.path, label:LABEL_MAP[m.subMenuName]||m.subMenuName, Icon:cfg.Icon });
      });
    }
    return nav;
  };
  const nav = buildNav();
  const isLoading = !isMobileUser && menusLoading;

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${open?"open":""}`} onClick={close}/>

      <aside className={`sidebar ${open?"open":""}`}>
        {/* Logo */}
        <div className="sidebar-brand" style={{ padding:"14px 16px" }}>
          <img src="/logo.svg" alt="MSN Infotec Gate Management"
            style={{ width:"100%", maxWidth:180, height:"auto" }}
            onError={e => {
              e.target.style.display = "none";
              e.target.nextElementSibling.style.display = "flex";
            }}/>
          {/* Fallback if logo fails */}
          <div style={{ display:"none", alignItems:"center", gap:8 }}>
            <Shield size={18} color="#f59e0b"/>
            <span style={{ fontWeight:800, fontSize:13, color:"var(--text)" }}>MSN Gate</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {isLoading ? (
            <div style={{ padding:"20px 16px", color:"var(--text3)", fontSize:12 }}>
              Loading menus...
            </div>
          ) : nav.map((item,i) =>
            item.section ? (
              <div key={`sec-${i}`} className="sidebar-section">{item.section}</div>
            ) : (
              <NavLink key={item.path} to={item.path}
                className={({isActive})=>`nav-item ${isActive?"active":""}`}
                onClick={close}>
                <item.Icon size={16} className="nav-icon"/>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.userName||"User"}</div>
              <div className="sidebar-user-gate">
                {gateLabel || (isMobileUser ? "Security Guard" : "Admin")}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={()=>setOpen(s=>!s)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className="topbar-breadcrumb">
            <span className="topbar-title">MSN Gate Management</span>
            {currentLabel && (
              <><span className="topbar-sep">/</span><span className="topbar-sub">{currentLabel}</span></>
            )}
          </div>
          <div className="topbar-right">
            {gateLabel && (
              <div className="topbar-gate-badge">
                <Layers size={12}/>{gateLabel}
              </div>
            )}
            <button className="topbar-logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={17}/>
              <span className="topbar-logout-label">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="page-content"><Outlet/></main>
        {isMobile && <BottomNav/>}
      </div>

      <PWAInstall/>
    </div>
  );
}
