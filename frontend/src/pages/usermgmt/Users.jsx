// frontend/src/pages/usermgmt/Users.jsx
// ✅ FIX 3: After restore → setIsActive(true) so user moves to active tab visually

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePermissions } from "../../context/AuthContext";
import { getUsers, deleteUser, restoreUser } from "../../services/userService";

const Ico = {
  Edit:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  Trash:  () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>),
  Plus:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Close:  () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Search: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  Lock:   () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>),
  Shield: () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  Restore: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
    </svg>
  ),
};

function Toast({ toast }) {
  if (!toast.msg) return null;
  return (
    <div className={`gm-toast ${toast.type === "error" ? "gm-toast-error" : ""}`}>
      <span>{toast.type === "error" ? "⚠" : "✓"}</span>
      {toast.msg}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div className="gm-toggle-wrap" role="switch" aria-checked={checked} tabIndex={0}
      onKeyDown={e => e.key === " " && onChange()}>
      <span className={`gm-toggle-label ${!checked ? "gm-toggle-label--on" : "gm-toggle-label--off"}`}
        onClick={onChange} style={{ cursor: "pointer" }}>Inactive</span>
      <div className={`gm-toggle-pill ${checked ? "gm-toggle-pill--active" : "gm-toggle-pill--inactive"}`}
        onClick={onChange}><div className="gm-toggle-knob" /></div>
      <span className={`gm-toggle-label ${checked ? "gm-toggle-label--on" : "gm-toggle-label--off"}`}
        onClick={onChange} style={{ cursor: "pointer" }}>Active</span>
    </div>
  );
}

function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th className="gm-th gm-th-sortable" onClick={() => onSort(field)} aria-sort={active ? sortDir : "none"}>
      <div className="gm-th-inner">
        {label}
        <span className="gm-sort-arrows">
          <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 0L7.46 5H.54L4 0z" fill={active && sortDir === "asc" ? "#818cf8" : "#475569"} /></svg>
          <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 5L.54 0H7.46L4 5z" fill={active && sortDir === "desc" ? "#818cf8" : "#475569"} /></svg>
        </span>
      </div>
    </th>
  );
}

function ConfirmModal({ username, onConfirm, onClose, deleting }) {
  return (
    <div className="gm-overlay" onClick={onClose}>
      <div className="gm-confirm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="gm-modal-close" onClick={onClose}><Ico.Close /></button>
        <div className="gm-confirm-emoji">🗑️</div>
        <h3 className="gm-confirm-title">Deactivate User</h3>
        <p className="gm-confirm-msg">
          Are you sure you want to deactivate <strong>{username}</strong>?<br />
          You can restore them from the Inactive view.
        </p>
        <div className="gm-confirm-actions">
          <button className="gm-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="gm-spinner-sm" />Deactivating...</> : "Yes, Deactivate"}
          </button>
          <button className="gm-btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { canAdd, canEdit, canDelete } = usePermissions("Users");

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isActive,  setIsActive]  = useState(true);
  const [search,    setSearch]    = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");
  const [confirm,   setConfirm]   = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const [toast, setToast] = useState(() => location.state?.toast || null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (location.state?.toast) window.history.replaceState({}, "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const res = await getUsers(isActive ? 1 : 0);
      setRows(res.data || []);
    } catch (e) {
      setLoadError(e.response?.data?.message || "Failed to load users.");
      setRows([]);
    } finally { setLoading(false); }
  }, [isActive]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(""); setSortField(null); }, [isActive]);

  const displayRows = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.username?.toLowerCase().includes(q));
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        let av = a[sortField] ?? ""; let bv = b[sortField] ?? "";
        if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ?  1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, search, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await deleteUser(confirm.uid);
      showToast(`"${confirm.username}" has been deactivated.`);
      setConfirm(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || "Deactivate failed.", "error");
      setConfirm(null);
    } finally { setDeleting(false); }
  };

  /* ── Restore ──
     ✅ FIX 3: setIsActive(true) after restore → auto-switches to active tab.
     useEffect on isActive fires load() which fetches active users.
  ── */
  const handleRestore = async (row) => {
    setLoadingId(row.uid);
    try {
      const res = await restoreUser(row.uid);
      showToast(res.message || `"${row.username}" has been restored.`);
      setIsActive(true);   // ← Switch to active tab; load() fires via useEffect
    } catch (err) {
      showToast(err.response?.data?.message || "Restore failed.", "error");
    } finally { setLoadingId(null); }
  };

  const COLS = [
    { key: "serialNo",   label: "SL. NO" },
    { key: "username",   label: "USERNAME" },
    { key: "menuAccess", label: "MENU ACCESS" },
  ];

  return (
    <div className="gm-page">
      <Toast toast={toast || { msg: "" }} />

      {confirm && (
        <ConfirmModal username={confirm.username}
          onConfirm={handleDelete} onClose={() => setConfirm(null)} deleting={deleting} />
      )}

      <div className="gm-page-header">
        <div>
          <h1 className="gm-page-title">Users List</h1>
          <p className="gm-page-subtitle">
            {isActive ? "Showing active users" : "Showing inactive users"}
          </p>
        </div>
        {isActive && canAdd && (
          <button className="gm-btn-add" onClick={() => navigate("/user-management/users/create")}>
            <Ico.Plus /> Add New User
          </button>
        )}
      </div>

      <div className="gm-controls">
        <Toggle checked={isActive} onChange={() => setIsActive(v => !v)} />
        <div className="gm-controls-right">
          <div className="gm-search-wrap">
            <span className="gm-search-icon"><Ico.Search /></span>
            <input type="text" className="gm-search-input" placeholder="Search users..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="gm-search-clear" onClick={() => setSearch("")}><Ico.Close /></button>
            )}
          </div>
        </div>
      </div>

      {loadError && <div className="gm-alert-error">⚠ {loadError}</div>}

      <div className="gm-table-wrap">
        {loading ? (
          <div className="gm-loading"><div className="gm-spinner" /><span>Loading users...</span></div>
        ) : (
          <table className="gm-table">
            <thead>
              <tr>
                {COLS.map(col => (
                  <SortTh key={col.key} label={col.label} field={col.key}
                    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                ))}
                <th className="gm-th gm-th-action">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr><td colSpan={4} className="gm-empty">
                  {search ? `No results for "${search}".`
                    : `No ${isActive ? "active" : "inactive"} users found.`}
                </td></tr>
              ) : (
                displayRows.map((row, idx) => (
                  <tr key={row.uid} className="gm-row">
                    <td className="gm-td gm-td-code">{idx + 1}</td>
                    <td className="gm-td" style={{ fontWeight: 600, color: "#e2e8f0" }}>{row.username}</td>
                    <td className="gm-td">
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(99,102,241,0.10)",
                        border: "1px solid rgba(99,102,241,0.22)",
                        borderRadius: 20, padding: "3px 10px",
                        fontSize: 12, fontWeight: 600, color: "#818cf8", whiteSpace: "nowrap",
                      }}>
                        <Ico.Shield />
                        {row.menuAccess} {row.menuAccess === 1 ? "menu" : "menus"}
                      </span>
                    </td>

                    <td className="gm-td gm-td-actions">
                      {isActive ? (
                        <>
                          {canEdit ? (
                            <button className="gm-icon-btn gm-icon-edit"
                              onClick={() => navigate(`/user-management/users/edit/${row.uid}`)}
                              disabled={loadingId === row.uid}
                              title={`Edit ${row.username}`}>
                              <Ico.Edit />
                            </button>
                          ) : (
                            <span className="gm-icon-locked"><Ico.Lock /></span>
                          )}
                          {canDelete ? (
                            <button className="gm-icon-btn gm-icon-delete"
                              onClick={() => setConfirm({ uid: row.uid, username: row.username })}
                              disabled={loadingId === row.uid}
                              title={`Deactivate ${row.username}`}>
                              <Ico.Trash />
                            </button>
                          ) : (
                            <span className="gm-icon-locked"><Ico.Lock /></span>
                          )}
                        </>
                      ) : (
                        canEdit ? (
                          <button className="gm-icon-btn gm-icon-restore"
                            onClick={() => handleRestore(row)}
                            disabled={loadingId === row.uid}
                            title={`Restore ${row.username}`}>
                            {loadingId === row.uid
                              ? <span className="gm-spinner-sm" />
                              : <Ico.Restore />
                            }
                          </button>
                        ) : (
                          <span className="gm-inactive-badge">Inactive</span>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <div className="gm-footer">
          {displayRows.length !== rows.length
            ? `${displayRows.length} of ${rows.length} users`
            : `${rows.length} user${rows.length !== 1 ? "s" : ""}`}
          {" · "}{isActive ? "🟢 Active" : "🔴 Inactive"}
        </div>
      )}
    </div>
  );
}