import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMenu, MENU_ROUTE_MAP } from "../context/MenuContext";
import {
  LayoutDashboard, Users, Car, Shield,
  UserCog, LogOut, Menu, X,
  Building2, MapPin, BadgeCheck, Layers,
} from "lucide-react";

const SUBMENU_CONFIG = {
  "Gate":         { Icon:Layers,     path:"/setup/gates" },
  "Securities":   { Icon:BadgeCheck, path:"/setup/securities" },
  "Designation":  { Icon:Building2,  path:"/setup/designations" },
  "Locations":    { Icon:MapPin,     path:"/setup/locations" },
  "Visitor List": { Icon:Users,      path:"/visitors" },
  "Vehicles List":{ Icon:Car,        path:"/vehicles" },
  "Patrols":      { Icon:Shield,     path:"/patrol" },
  "Users":        { Icon:UserCog,    path:"/users" },
};
const LABEL_MAP = {
  "Gate":"Gates","Designation":"Designations",
  "Visitor List":"Visitors","Vehicles List":"Vehicles",
  "Patrols":"Security Patrol","Users":"User Management",
};
const PAGE_LABELS = {
  "/dashboard":"Dashboard","/visitors":"Visitors",
  "/visitors/new":"New Visitor","/vehicles":"Vehicles",
  "/vehicles/new":"New Vehicle","/patrol":"Security Patrol",
  "/setup/gates":"Gates","/setup/securities":"Securities",
  "/setup/designations":"Designations","/setup/locations":"Locations",
  "/users":"User Management",
};

// Sidebar width as a constant — used in both sidebar and main-wrap
const SIDEBAR_W = 220;

export default function AppLayout() {
  const { user, logout }  = useAuth();
  const { menus, loading:menusLoading } = useMenu();
  const navigate = useNavigate();
  const location = useLocation();
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

  const initials = (user?.userName||"U").slice(0,2).toUpperCase();
  const gateLabel = user?.gateName || (user?.gateId ? `Gate ${user.gateId}` : null);

  const buildNav = () => {
    if (menusLoading || menus.length === 0) return [];
    const nav = [{ path:"/dashboard", label:"Dashboard", Icon:LayoutDashboard, section:null }];
    let lastGroup = null;
    menus.forEach(m => {
      const cfg = SUBMENU_CONFIG[m.subMenuName];
      if (!cfg) return;
      const group = m.menuname;
      if (group !== lastGroup) { nav.push({ section:group }); lastGroup = group; }
      if (!nav.find(n => n.path === cfg.path)) {
        nav.push({ path:cfg.path, label:LABEL_MAP[m.subMenuName]||m.subMenuName, Icon:cfg.Icon });
      }
    });
    return nav;
  };
  const nav = buildNav();

  return (
    // Use inline styles for layout so no CSS conflict
    <div style={{ display:"flex", minHeight:"100vh", position:"relative" }}>
      {/* Overlay for mobile */}
      {open && (
        <div onClick={close} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,
          display:"block",
        }}/>
      )}

      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 210,
        background: "var(--sidebar-bg, var(--surface))",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        // Mobile: slide in/out
        transform: `translateX(${open ? 0 : "-100%"})`,
        transition: "transform .25s ease",
      }}
      className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><Shield size={18} color="#000" strokeWidth={2.5}/></div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">MSN Gate</div>
            <div className="sidebar-brand-sub">Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex:1 }}>
          {menusLoading ? (
            <div style={{ padding:"20px 16px",color:"var(--text3)",fontSize:12 }}>Loading menus...</div>
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
              <div className="sidebar-user-gate">{gateLabel||"No gate"}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={14}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content — offset by sidebar width on desktop */}
      <div style={{
        flex: 1,
        marginLeft: SIDEBAR_W,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
      // On mobile, no offset (sidebar is overlay)
      className="main-wrap">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setOpen(s=>!s)}>
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
          </div>
        </header>
        <main className="page-content"><Outlet/></main>
      </div>
    </div>
  );
}