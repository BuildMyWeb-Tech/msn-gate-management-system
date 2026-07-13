import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, Car, Shield, DoorOpen,
  Settings, UserCog, LogOut, Menu, X,
  Building2, MapPin, BadgeCheck, Layers
} from "lucide-react";

const NAV = [
  { section: "Operations" },
  { path: "/dashboard",             label: "Dashboard",        Icon: LayoutDashboard },
  { path: "/visitors",              label: "Visitors",         Icon: Users },
  { path: "/vehicles",              label: "Vehicles",         Icon: Car },
  { path: "/patrol",                label: "Security Patrol",  Icon: Shield },
  { section: "Setup" },
  { path: "/setup/gates",           label: "Gates",            Icon: Layers },
  { path: "/setup/securities",      label: "Securities",       Icon: BadgeCheck },
  { path: "/setup/designations",    label: "Designations",     Icon: Building2 },
  { path: "/setup/locations",       label: "Locations",        Icon: MapPin },
  { section: "Administration" },
  { path: "/users",                 label: "User Management",  Icon: UserCog },
];

const PAGE_LABELS = {
  "/dashboard":           "Dashboard",
  "/visitors":            "Visitors",
  "/visitors/new":        "New Visitor",
  "/vehicles":            "Vehicles",
  "/vehicles/new":        "New Vehicle",
  "/patrol":              "Security Patrol",
  "/setup/gates":         "Gates",
  "/setup/securities":    "Securities",
  "/setup/designations":  "Designations",
  "/setup/locations":     "Locations",
  "/users":               "User Management",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };
  const close = () => setOpen(false);

  const currentLabel = (() => {
    const path = location.pathname;
    if (PAGE_LABELS[path]) return PAGE_LABELS[path];
    if (path.startsWith("/visitors/edit/")) return "Edit Visitor";
    if (path.startsWith("/vehicles/edit/")) return "Edit Vehicle";
    if (path.startsWith("/users/") && path.includes("permissions")) return "User Permissions";
    return "";
  })();

  const initials = (user?.userName || "U").slice(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={close} />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">MSN Gate</div>
            <div className="sidebar-brand-sub">Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) =>
            item.section ? (
              <div key={i} className="sidebar-section">{item.section}</div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={close}
              >
                <item.Icon size={16} className="nav-icon" />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.userName || "User"}</div>
              <div className="sidebar-user-gate">
                {user?.gateName || (user?.gateId ? `Gate ${user.gateId}` : "No gate")}
              </div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setOpen(s => !s)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar-breadcrumb">
            <span className="topbar-title">MSN Gate Management</span>
            {currentLabel && (
              <>
                <span className="topbar-sep">/</span>
                <span className="topbar-sub">{currentLabel}</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            {(user?.gateName || user?.gateId) && (
              <div className="topbar-gate-badge">
                <Layers size={12} />
                {user.gateName || `Gate ${user.gateId}`}
              </div>
            )}
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
