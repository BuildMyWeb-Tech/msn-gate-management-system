// src/pages/admin/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const NAV = [
  { to: '/admin',           icon: '📊', label: 'Overview',  end: true },
  { to: '/admin/companies', icon: '🏭', label: 'Companies' },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when navigating
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const pageTitle = (() => {
    if (location.pathname === '/admin')                    return 'Overview';
    if (location.pathname.startsWith('/admin/companies/')) return 'Company Details';
    if (location.pathname === '/admin/companies')          return 'Companies';
    return 'Admin Panel';
  })();

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div className="admin-layout">

      {/* ── Single sidebar — CSS handles desktop sticky vs mobile drawer ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🖨️</div>
            <span className="sidebar-logo-text">PrintMixBox</span>
            <span className="sidebar-tag">Admin</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{admin?.username}</div>
              <div className="sidebar-user-role" style={{ textTransform: 'capitalize' }}>
                {admin?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-item"
            style={{ marginTop: 4, color: 'rgba(255,255,255,0.4)', width: '100%' }}
          >
            <span className="sidebar-item-icon">↩</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Overlay — only visible when mobile drawer is open ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content area ── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-btn"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <span className="admin-topbar-title">{pageTitle}</span>
          </div>
          <div className="admin-topbar-right">
            <span
              className="hidden-sm"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {admin?.username}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}