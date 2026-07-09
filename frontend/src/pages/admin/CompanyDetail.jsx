// src/pages/admin/CompanyDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompanyById, approveCompany, rejectCompany, resendCredentials } from '../../services/adminService';

const STATUS_BADGE = {
  pending:  <span className="badge badge-yellow">Pending Review</span>,
  approved: <span className="badge badge-green">Approved</span>,
  rejected: <span className="badge badge-red">Rejected</span>,
};

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [toast, setToast]     = useState('');
  const [note, setNote]       = useState('');
  const [showNoteBox, setShowNoteBox] = useState(null); // 'approve' | 'reject'

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCompanyById(id);
      setData(res.data);
    } catch { navigate('/admin/companies'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    setBusy(true);
    try {
      await approveCompany(id, note);
      showToast(`✅ Company approved — credentials sent to ${data.company.email}`);
      setShowNoteBox(null); setNote('');
      load();
    } catch (err) { showToast(`❌ ${err.response?.data?.message || 'Failed.'}`); }
    finally { setBusy(false); }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await rejectCompany(id, note);
      showToast('Company rejected.');
      setShowNoteBox(null); setNote('');
      load();
    } catch (err) { showToast(`❌ ${err.response?.data?.message || 'Failed.'}`); }
    finally { setBusy(false); }
  };

  const handleResend = async () => {
    setBusy(true);
    try {
      await resendCredentials(id);
      showToast(`📧 New credentials sent to ${data.company.email}`);
    } catch (err) { showToast(`❌ ${err.response?.data?.message || 'Failed.'}`); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}><div className="pmb-spinner" /></div>;
  if (!data)   return null;

  const { company, users } = data;

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#1e293b', color: '#fff', padding: '12px 18px', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', boxShadow: 'var(--shadow-lg)', maxWidth: 400, animation: 'fadeInUp 0.2s ease' }}>
          {toast}
        </div>
      )}

      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/admin/companies')}>
        ← Back to Companies
      </button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.3px' }}>{company.companyName}</h2>
              {STATUS_BADGE[company.status]}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{company.email}</p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {company.status === 'pending' && (
              <>
                <button className="btn btn-success" disabled={busy} onClick={() => setShowNoteBox(showNoteBox === 'approve' ? null : 'approve')}>
                  ✓ Approve & Send Credentials
                </button>
                <button className="btn btn-danger" disabled={busy} onClick={() => setShowNoteBox(showNoteBox === 'reject' ? null : 'reject')}>
                  Reject
                </button>
              </>
            )}
            {company.status === 'approved' && (
              <button className="btn btn-secondary" disabled={busy} onClick={handleResend}>
                {busy ? <><span className="btn-spinner btn-spinner-dark" />Sending...</> : '📧 Resend Credentials'}
              </button>
            )}
          </div>
        </div>

        {/* Inline action note box */}
        {showNoteBox && (
          <div style={{ padding: 16, background: showNoteBox === 'approve' ? 'var(--color-success-bg)' : 'var(--color-error-bg)', border: `1px solid ${showNoteBox === 'approve' ? 'var(--color-success-border)' : 'var(--color-error-border)'}`, borderRadius: 'var(--radius-lg)', marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--text-sm)', marginBottom: 10, fontWeight: 'var(--weight-medium)', color: showNoteBox === 'approve' ? 'var(--color-success)' : 'var(--color-error)' }}>
              {showNoteBox === 'approve'
                ? `Approving will generate a company code and email login credentials to ${company.email}.`
                : 'This will mark the application as rejected.'}
            </p>
            <textarea
              className="form-input" rows={2}
              placeholder={showNoteBox === 'approve' ? 'Admin note (optional)' : 'Reason for rejection (optional)'}
              value={note} onChange={e => setNote(e.target.value)}
              style={{ height: 'auto', padding: '8px 12px', marginBottom: 10, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn ${showNoteBox === 'approve' ? 'btn-success' : 'btn-danger'}`}
                disabled={busy}
                onClick={showNoteBox === 'approve' ? handleApprove : handleReject}
              >
                {busy
                  ? <><span className="btn-spinner" />{showNoteBox === 'approve' ? 'Approving...' : 'Rejecting...'}</>
                  : showNoteBox === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowNoteBox(null); setNote(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Company details */}
        <div>
          {[
            { label: 'Company Name', value: company.companyName },
            { label: 'GST Number',   value: company.gstNumber, mono: true },
            { label: 'Email',        value: company.email },
            { label: 'Company Code', value: company.companyCode || '—', mono: true },
            { label: 'Plan',         value: company.plan, capitalize: true },
            { label: 'Registered',   value: fmt(company.createdAt) },
            { label: 'Credentials Sent', value: fmt(company.credentialsSentAt) },
            { label: 'Admin Note',   value: company.adminNote || '—' },
          ].map(r => (
            <div className="info-row" key={r.label}>
              <span className="info-row-label">{r.label}</span>
              <span className={`info-row-value${r.mono ? ' mono' : ''}`} style={r.capitalize ? { textTransform: 'capitalize' } : {}}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      {users && users.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Company Users</span>
            <span className="badge badge-gray">{users.length}</span>
          </div>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Temp Password</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{u.username}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{u.email}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                    <td>
                      {u.isTemporaryPassword
                        ? <span className="badge badge-yellow">Yes — not changed</span>
                        : <span className="badge badge-green">No — password set</span>}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{fmt(u.lastLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}