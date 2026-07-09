// frontend/src/components/AppLayout.jsx
// Logo image served from: frontend/public/brand/logo.png  → URL: /brand/logo.png
// Falls back to text if image is missing
// ✅ SESSION TIMEOUT: auto-logout after 5 min idle (useSessionTimeout hook)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMenus } from '../services/authService';
import { useSessionTimeout } from '../hooks/useSessionTimeout';   // ← NEW

import {
  Settings, ClipboardList, Printer, Package,
  Truck, Users, LayoutDashboard, ChevronDown,
  Building2, UserCog, Users2, Factory, Workflow,
  FileText, LogOut, User, PanelLeftClose, PanelLeftOpen,
  ChevronRight,
} from 'lucide-react';

/* ── Icon maps ─────────────────────────────────────────────── */
const MENU_ICONS = {
  'Setup':           Settings,
  'Planning':        ClipboardList,
  'Pre Press':       Printer,
  'Press':           Printer,
  'Post Press':      Package,
  'Logistics':       Truck,
  'User Management': Users,
};

const SUBMENU_ICONS = {
  'Department':  Building2,
  'Designation': UserCog,
  'Employees':   Users2,
  'Machines':    Factory,
  'Process':     Workflow,
  'Job Card':    FileText,
  'Customers':   Users2,
};

function getRoute(menuName, subName) {
  const section = menuName.toLowerCase().replace(/\s+/g, '-');
  const sub     = subName.toLowerCase().replace(/\s+/g, '-');
  return `/${section}/${sub}`;
}

/* ── Sidebar brand logo ─────────────────────────────────────── */
function SidebarLogo({ collapsed }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (collapsed) {
    return (
      <div className="app-sidebar-brand app-sidebar-brand--collapsed">
        <div className="app-logo-icon-only">
          {!imgFailed ? (
            <img
              src="/brand/logo.png"
              alt="MP"
              className="app-sidebar-logo-img-sm"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>MP</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-sidebar-brand">
      <div className="app-sidebar-logo">
        {!imgFailed ? (
          <img
            src="/brand/logo.png"
            alt="Mr. Press Management"
            className="app-sidebar-logo-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="app-logo-icon">
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>MP</span>
          </div>
        )}
        <div className="app-logo-text">
          <span className="app-logo-name">Mr. Press</span>
          <span className="app-logo-sub">Management</span>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar menu item ──────────────────────────────────────── */
function SidebarMenu({ group, isOpen, onToggle, collapsed }) {
  const location = useLocation();
  const Icon = MENU_ICONS[group.menu] || Settings;

  const isAnyChildActive = group.subMenus.some(sub =>
    location.pathname.startsWith(getRoute(group.menu, sub.name))
  );

  if (collapsed) {
    return (
      <div className="sidebar-menu-group sidebar-menu-group--collapsed" title={group.menu}>
        <button
          className={`sidebar-menu-btn sidebar-menu-btn--icon ${isAnyChildActive ? 'has-active' : ''}`}
          onClick={onToggle}
        >
          <span className="sidebar-menu-icon"><Icon size={18} /></span>
        </button>
        {isOpen && (
          <div className="sidebar-submenu-flyout">
            <div className="sidebar-flyout-label">{group.menu}</div>
            {group.subMenus.map(sub => {
              const route   = getRoute(group.menu, sub.name);
              const SubIcon = SUBMENU_ICONS[sub.name];
              return (
                <NavLink
                  key={sub.id}
                  to={route}
                  className={({ isActive }) =>
                    `sidebar-submenu-item sidebar-flyout-item ${isActive ? 'active' : ''}`
                  }
                >
                  {SubIcon && <SubIcon size={14} style={{ marginRight: 8 }} />}
                  {sub.name}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sidebar-menu-group">
      <button
        className={`sidebar-menu-btn ${isAnyChildActive ? 'has-active' : ''}`}
        onClick={onToggle}
      >
        <span className="sidebar-menu-icon"><Icon size={18} /></span>
        <span className="sidebar-menu-label">{group.menu}</span>
        <ChevronDown size={16} className={`sidebar-menu-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      <div className={`sidebar-submenu ${isOpen ? 'open' : ''}`}>
        {group.subMenus.map(sub => {
          const route   = getRoute(group.menu, sub.name);
          const SubIcon = SUBMENU_ICONS[sub.name];
          return (
            <NavLink
              key={sub.id}
              to={route}
              className={({ isActive }) =>
                `sidebar-submenu-item ${isActive ? 'active' : ''}`
              }
            >
              {SubIcon && <SubIcon size={14} style={{ marginRight: 8 }} />}
              {sub.name}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

/* ── User Dropdown ──────────────────────────────────────────── */
function UserDropdown({ username, onLogout, onProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = username
    ? username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="topbar-user-wrap" ref={ref}>
      <button className="topbar-user-btn" onClick={() => setOpen(v => !v)}>
        <div className="topbar-avatar">{initials}</div>
        <span className="topbar-username">{username || 'User'}</span>
        <ChevronDown size={14} className={`topbar-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="topbar-dropdown">
          <div className="topbar-dropdown-header">
            <div className="topbar-dropdown-avatar">{initials}</div>
            <div>
              <div className="topbar-dropdown-name">{username || 'User'}</div>
              <div className="topbar-dropdown-role">Member</div>
            </div>
          </div>
          <div className="topbar-dropdown-divider" />
          <button
            className="topbar-dropdown-item"
            onClick={() => { setOpen(false); onProfile(); }}
          >
            <User size={14} />
            Profile
          </button>
          <button
            className="topbar-dropdown-item topbar-dropdown-item--danger"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN AppLayout
═══════════════════════════════════════════════════════════ */
export default function AppLayout() {
  const { userId, username, logout, menuGroups } = useAuth();

  const navigate  = useNavigate();
  const location  = useLocation();

  const [openGroups,  setOpenGroups]  = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  /* ── Session timeout: logout after 5 min idle ── */
  const handleTimeout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  useSessionTimeout(handleTimeout);   // ← NEW: single line wires up the timer

  /* ── Mobile: close sidebar on route change ── */
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  /* ── Body scroll lock when mobile sidebar open ── */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const toggleGroup = useCallback((name) => {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const handleLogout  = () => { logout(); navigate('/login'); };
  const handleProfile = () => { navigate('/profile'); };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'app-sidebar--collapsed' : ''}`}>

        <SidebarLogo collapsed={collapsed} />

        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen  size={16} />
            : <PanelLeftClose size={16} />
          }
        </button>

        <nav className="app-sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-dashboard-link ${isActive ? 'active' : ''} ${collapsed ? 'sidebar-dashboard-link--icon' : ''}`
            }
            title={collapsed ? 'Dashboard' : undefined}
          >
            <span className="sidebar-menu-icon"><LayoutDashboard size={18} /></span>
            {!collapsed && <span className="sidebar-menu-label">Dashboard</span>}
          </NavLink>

          {menuGroups.length === 0 ? (
            !collapsed && (
              <div style={{ padding: 20, color: '#94a3b8', fontSize: 13 }}>
                Loading menus…
              </div>
            )
          ) : (
            menuGroups.map(group => (
              <SidebarMenu
                key={group.menu}
                group={group}
                isOpen={!!openGroups[group.menu]}
                onToggle={() => toggleGroup(group.menu)}
                collapsed={collapsed}
              />
            ))
          )}
        </nav>

        <div className="app-sidebar-footer">
          <button className="app-logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} className="icon" />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main area ── */}
      <div className="app-main">
        <header className="app-topbar">
          <button className="app-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen
              ? <ChevronRight size={20} />
              : <PanelLeftOpen size={20} />
            }
          </button>

          <div className="app-topbar-brand">
            <img
              src="/brand/logo.png"
              alt=""
              className="app-topbar-logo"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            <span>Mr. Press Management</span>
          </div>

          <div style={{ flex: 1 }} />

          <UserDropdown
            username={username}
            onLogout={handleLogout}
            onProfile={handleProfile}
          />
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}