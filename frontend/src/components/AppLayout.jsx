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

  const buildNav = () => {
    const nav = [{ path:"/dashboard", label:"Dashboard", Icon:LayoutDashboard }];
    if (isMobileUser && user?.mobileMenus?.length) {
      user.mobileMenus.forEach(m => {
        const cfg = MOBILE_MENU_CONFIG[m.menuname];
        if (cfg && !nav.find(n => n.path === cfg.path))
          nav.push({ path:cfg.path, label:m.menuname, Icon:cfg.Icon });
      });
    } else {
      if (!menusLoading && desktopMenus.length) {
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
    }
    return nav;
  };
  const nav = buildNav();
  const isLoading = !isMobileUser && menusLoading;

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${open?"open":""}`} onClick={close}/>

      <aside className={`sidebar ${open?"open":""}`}>
        {/* Logo row — MSN Infotec logo + logout icon */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 14px",
          borderBottom:"1px solid var(--border)",
          flexShrink:0,
        }}>
          {/* MSN Infotec logo */}
          <img
            src="/msn-logo.png"
            alt="MSN Infotec"
            style={{ height:36, width:"auto", objectFit:"contain" }}
            onError={e => { e.target.style.display="none"; }}
          />
          {/* Logout icon — at end of logo row */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background:"none", border:"1px solid var(--border)",
              borderRadius:"var(--radius-xs)",
              width:32, height:32,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:"var(--text3)",
              flexShrink:0, marginLeft:8,
              transition:"all var(--transition)",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--red)";e.currentTarget.style.color="var(--red)";e.currentTarget.style.background="var(--red-dim)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text3)";e.currentTarget.style.background="none";}}>
            <LogOut size={15}/>
          </button>
        </div>

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

        {/* User info at bottom — no logout button here */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.userName||"User"}</div>
              <div className="sidebar-user-gate">
                {gateLabel||(isMobileUser?"Security Guard":"Admin")}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={()=>setOpen(s=>!s)}>
            {open?<X size={20}/>:<Menu size={20}/>}
          </button>

          {/* Compact title — reduced size */}
          <div className="topbar-breadcrumb" style={{minWidth:0,flex:1}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>
              MSN Gate
            </span>
            {currentLabel && (
              <>
                <span className="topbar-sep" style={{margin:"0 4px"}}>/</span>
                <span style={{fontSize:12,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {currentLabel}
                </span>
              </>
            )}
          </div>

          {/* Gate badge — compact */}
          {gateLabel && (
            <div style={{
              display:"flex", alignItems:"center", gap:4,
              padding:"4px 8px",
              background:"var(--accent-dim)",
              border:"1px solid rgba(245,158,11,0.25)",
              borderRadius:20,
              fontSize:11, fontWeight:600, color:"var(--accent)",
              whiteSpace:"nowrap", flexShrink:0,
              maxWidth:130, overflow:"hidden", textOverflow:"ellipsis",
            }}>
              <Layers size={11} style={{flexShrink:0}}/>
              <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{gateLabel}</span>
            </div>
          )}
        </header>

        <main className="page-content"><Outlet/></main>
        {isMobile && <BottomNav/>}
      </div>

      <PWAInstall/>
    </div>
  );
}