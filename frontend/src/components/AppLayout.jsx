import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMenu, ROUTE_MAP, LABEL_MAP } from "../context/MenuContext";
import { useResponsive } from "../hooks/useResponsive";
import BottomNav from "./BottomNav";
import PWAInstall from "./PWAInstall";
import {
  Users, Car, Shield, UserCog, Menu, X,
  Building2, MapPin, BadgeCheck, Layers, LogOut,
  LayoutDashboard, Settings, Truck,
} from "lucide-react";

// ── Dynamic icon map — add new icons here as needed ──────────
const ICON_MAP = {
  "/dashboard":              LayoutDashboard,
  "/setup/gates":            Layers,
  "/setup/securities":       BadgeCheck,
  "/setup/designations":     Building2,
  "/setup/patrol-points":    MapPin,
  "/setup/cop-vehicles":     Truck,
  "/setup/patrol-plan":      Settings,
  "/setup/patrol-schedule":  Settings,
  "/visitors":               Users,
  "/vehicles":               Car,
  "/patrol":                 Shield,
  "/users":                  UserCog,
};
const DEFAULT_ICON = Settings;

// Mobile menus from PR_GetApp_UserMenus
const MOBILE_MENU_ROUTES = {
  "visitors":        "/visitors",
  "vehicles":        "/vehicles",
  "security patrol": "/patrol",
};

const PAGE_LABELS = {
  "/dashboard":              "Dashboard",
  "/visitors":               "Visitors",
  "/visitors/new":           "New Visitor",
  "/vehicles":               "Vehicles",
  "/vehicles/new":           "New Vehicle",
  "/patrol":                 "Security Patrol",
  "/setup/gates":            "Gates",
  "/setup/securities":       "Securities",
  "/setup/designations":     "Designations",
  "/setup/patrol-points":    "Patrol Points",
  "/setup/cop-vehicles":     "Comp. Vehicles",
  "/setup/patrol-plan":      "Patrol Plan",
  "/setup/patrol-schedule":  "Patrol Schedule",
  "/users":                  "User Management",
};

export default function AppLayout() {
  const { user, logout, isMobileUser } = useAuth();
  const { menus, loading: menusLoading } = useMenu();
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

  // ── Build nav from SP data dynamically ───────────────────────
  const buildNav = () => {
    const nav = [{ path:"/dashboard", label:"Dashboard", Icon:LayoutDashboard }];

    if (isMobileUser && user?.mobileMenus?.length) {
      // Mobile: from PR_GetApp_UserMenus
      user.mobileMenus.forEach(m => {
        const key   = (m.menuname||"").toLowerCase();
        const path  = MOBILE_MENU_ROUTES[key];
        if (path && !nav.find(n => n.path === path)) {
          const Icon = ICON_MAP[path] || DEFAULT_ICON;
          nav.push({ path, label: m.menuname, Icon });
        }
      });
      return nav;
    }

    // Desktop: from PR_Get_UserMenus (returns menuname + SubMenuName)
    if (menusLoading || !menus.length) return nav;

    let lastGroup = null;
    menus.forEach(m => {
      // Get route from SubMenuName — dynamic lookup
      const subKey  = (m.subMenuName || m.SubMenuName || "").toLowerCase().trim();
      const path    = ROUTE_MAP[subKey];
      if (!path) return; // unknown menu — skip

      const group = m.menuname || m.MenuName || "";

      // Section header when group changes
      if (group && group !== lastGroup) {
        nav.push({ section: group });
        lastGroup = group;
      }

      // Avoid duplicate paths
      if (nav.find(n => n.path === path)) return;

      // Label: use LABEL_MAP override or original SubMenuName
      const label = LABEL_MAP[subKey] || m.subMenuName || m.SubMenuName || path;
      const Icon  = ICON_MAP[path] || DEFAULT_ICON;

      nav.push({ path, label, Icon });
    });

    return nav;
  };

  const nav = buildNav();
  const isLoading = !isMobileUser && menusLoading;

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${open?"open":""}`} onClick={close}/>

      <aside className={`sidebar ${open?"open":""}`}>
        {/* Logo + logout in same row */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 14px", borderBottom:"1px solid var(--border)", flexShrink:0,
        }}>
          <img src="/msn-logo.png" alt="MSN Infotec"
            style={{ height:36, width:"auto", objectFit:"contain" }}
            onError={e => e.target.style.display="none"}/>
          {/* <button onClick={handleLogout} title="Sign Out" style={{
            background:"none", border:"1px solid var(--border)",
            borderRadius:"var(--radius-xs)", width:32, height:32,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", color:"var(--text3)", flexShrink:0, marginLeft:8,
            transition:"all var(--transition)",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--red)";e.currentTarget.style.color="var(--red)";e.currentTarget.style.background="var(--red-dim)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text3)";e.currentTarget.style.background="none";}}>
            <LogOut size={15}/>
          </button> */}
        </div>

        {/* Dynamic nav */}
        <nav className="sidebar-nav">
          {isLoading ? (
            <div style={{padding:"20px 16px",color:"var(--text3)",fontSize:12}}>Loading menus...</div>
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
              <div className="sidebar-user-gate">{gateLabel||(isMobileUser?"Security Guard":"Admin")}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={()=>setOpen(s=>!s)}>
            {open?<X size={20}/>:<Menu size={20}/>}
          </button>
          <div className="topbar-breadcrumb" style={{minWidth:0,flex:1}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>MSN Gate</span>
            {currentLabel&&(
              <><span className="topbar-sep" style={{margin:"0 4px"}}>/</span>
              <span style={{fontSize:12,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentLabel}</span></>
            )}
          </div>
          {gateLabel&&(
            <div style={{
              display:"flex",alignItems:"center",gap:4,padding:"4px 8px",
              background:"var(--accent-dim)",border:"1px solid rgba(245,158,11,0.25)",
              borderRadius:20,fontSize:11,fontWeight:600,color:"var(--accent)",
              whiteSpace:"nowrap",flexShrink:0,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",
            }}>
              <Layers size={11} style={{flexShrink:0}}/>
              <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{gateLabel}</span>
            </div>
          )}
          {/* Sign Out button — top right corner */}
          <button onClick={handleLogout} title="Sign Out" style={{
            display:"flex",alignItems:"center",gap:5,
            padding:"5px 10px",
            background:"none",border:"1px solid var(--border)",
            borderRadius:"var(--radius-xs)",
            cursor:"pointer",color:"var(--text3)",fontSize:12,
            flexShrink:0,marginLeft:8,
            transition:"all .15s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--red)";e.currentTarget.style.color="var(--red)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text3)";}}>
            <LogOut size={14}/>
            <span className="topbar-logout-label">Sign Out</span>
          </button>
        </header>

        <main className="page-content"><Outlet/></main>
        {isMobile&&<BottomNav/>}
      </div>

      <PWAInstall/>
    </div>
  );
}