// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats } from '../../services/adminService';

const STATUS_BADGE = {
  pending:  <span className="badge badge-yellow">Pending</span>,
  approved: <span className="badge badge-green">Approved</span>,
  rejected: <span className="badge badge-red">Rejected</span>,
};

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    getStats()
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div className="pmb-spinner" />
    </div>
  );

  if (error) return <div className="alert alert-error">{error}</div>;

  const { stats, recentRegistrations } = data;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { icon: '🏭', value: stats.total,    label: 'Total Companies',   color: 'var(--color-text-primary)', to: '/admin/companies' },
          { icon: '⏳', value: stats.pending,  label: 'Pending Approval',  color: 'var(--color-warning)',      to: '/admin/companies?status=pending' },
          { icon: '✅', value: stats.approved, label: 'Approved',          color: 'var(--color-success)',      to: '/admin/companies?status=approved' },
          { icon: '❌', value: stats.rejected, label: 'Rejected',          color: 'var(--color-error)',        to: '/admin/companies?status=rejected' },
        ].map(s => (
          <div className="stat-card" key={s.label}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(s.to)}
          >
            <div style={{ fontSize: 18, marginBottom: 10 }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {stats.pending > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <span>⚠️</span>
          <span>
            <strong>{stats.pending} company registration{stats.pending > 1 ? 's' : ''}</strong> pending review.&nbsp;
            <span
              onClick={() => navigate('/admin/companies?status=pending')}
              style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
            >
              Review now →
            </span>
          </span>
        </div>
      )}

      {/* Recent registrations */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Registrations</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/companies')}>View all</button>
        </div>

        {recentRegistrations.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-state-icon">🏭</div>
            <h3>No registrations yet</h3>
            <p>When companies register, they will appear here.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentRegistrations.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 'var(--weight-medium)' }}>{c.companyName}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{c.email}</td>
                    <td>{STATUS_BADGE[c.status]}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{fmt(c.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/companies/${c._id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}