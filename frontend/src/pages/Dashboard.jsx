// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboard, getMenus } from '../services/authService';

export default function Dashboard() {
  const { userId, username, permissionMap } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]     = useState(null);
  const [menus, setMenus]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

 useEffect(() => {
  if (!userId || loaded) return;

  getDashboard(userId)
    .then((res) => {
      if (res.success) setStats(res.data);
    })
    .finally(() => {
      setLoading(false);
      setLoaded(true); // ✅ prevents re-call
    });

}, [userId, loaded]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div className="pmb-spinner" />
    </div>
  );

  return (
    <div className="dash-page">
      {/* Page header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{greeting()}, {username} 👋</h1>
          <p className="dash-subtitle">Here's what's happening with your press operations today.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="dash-stats-row">
        {[
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            ),
            label: 'Total Modules',
            value: stats?.totalModules ?? '—',
            color: '#2563eb',
            bg: '#eff4ff',
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            ),
            label: 'Total Sub-Menus',
            value: stats?.totalSubMenus ?? '—',
            color: '#16a34a',
            bg: '#f0fdf4',
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            ),
            label: 'Logged In User',
            value: username,
            color: '#d97706',
            bg: '#fffbeb',
            isText: true,
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            ),
            label: 'Session',
            value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            color: '#7c3aed',
            bg: '#f5f3ff',
            isText: true,
          },
        ].map(s => (
          <div className="dash-stat-card" key={s.label}>
            <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="dash-stat-body">
              <div className="dash-stat-value" style={s.isText ? { fontSize: 16, fontWeight: 600 } : {}}>
                {s.value}
              </div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Module cards grid */}
      <div className="dash-section-header">
        <h2>Your Modules</h2>
        <p>Quick access to all sections you have permission to use</p>
      </div>

      <div className="dash-modules-grid">
        {menus.map((group) => (
          <div className="dash-module-card" key={group.menu}>
            <div className="dash-module-header">
              <span className="dash-module-icon">
                {({ 'Setup': '⚙️', 'Planning': '📋', 'Pre Press': '🖨️', 'Press': '🖨️', 'Post Press': '📦', 'Logistics': '🚚', 'User Management': '👥' })[group.menu] || '📄'}
              </span>
              <h3 className="dash-module-name">{group.menu}</h3>
              <span className="dash-module-count">{group.subMenus.length}</span>
            </div>
            <div className="dash-module-subs">
              {group.subMenus.map(sub => (
                <span key={sub.id} className="dash-module-sub-chip">
                  {sub.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}