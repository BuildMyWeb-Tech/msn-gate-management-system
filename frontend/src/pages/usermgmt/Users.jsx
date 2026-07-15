import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { Plus, Pencil, Trash2, RotateCcw, Key, RefreshCw, UserCog, Search } from "lucide-react";

export default function Users() {
  const navigate     = useNavigate();
  const { isMobile } = useResponsive();
  const [tab, setTab]         = useState(1);
  const [rows, setRows]       = useState([]);
  const [q, setQ]             = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [delId, setDelId]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/users?tag=${tab}`);
      // Service now returns normalised: { uid, userName, active }
      setRows(r.data?.data || []);
    } catch {
      setToast({ type: "error", msg: "Failed to load users" });
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = q
    ? rows.filter(r =>
        (r.userName || "").toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  const handleDelete = async (uid) => {
    try {
      await api.delete(`/users/${uid}`);
      setToast({ type: "success", msg: "User deleted" });
      setDelId(null);
      load();
    } catch { setToast({ type: "error", msg: "Failed to delete" }); }
  };

  const handleRestore = async (uid) => {
    try {
      await api.patch(`/users/${uid}/restore`);
      setToast({ type: "success", msg: "User restored" });
      load();
    } catch { setToast({ type: "error", msg: "Failed to restore" }); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserCog size={22} /> User Management
          </h1>
          <p>{filtered.length} user{filtered.length !== 1 ? "s" : ""} • {tab === 1 ? "Active" : "Inactive"}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={() => navigate("/users/new")}>
            <Plus size={15} /> Add User
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toggle-tabs">
          <button className={`toggle-tab ${tab === 1 ? "active" : ""}`} onClick={() => setTab(1)}>Active</button>
          <button className={`toggle-tab ${tab === 0 ? "active" : ""}`} onClick={() => setTab(0)}>Inactive</button>
        </div>
        <div className="toolbar-search" style={{ flex: 1 }}>
          <Search size={14} className="toolbar-search-icon" />
          <input
            className="form-input"
            placeholder="Search username..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="spinner-page"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><UserCog size={22} /></div>
          <h3>No users found</h3>
          <p>{tab === 1 ? "No active users" : "No inactive users"}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Username</th>
                {!isMobile && <th>Status</th>}
                {!isMobile && <th>User ID</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.uid ?? i}>
                  <td className="td-muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{row.userName || "—"}</td>
                  {!isMobile && (
                    <td>
                      {row.active
                        ? <span className="badge badge-in">Active</span>
                        : <span className="badge badge-out">Inactive</span>}
                    </td>
                  )}
                  {!isMobile && <td className="td-muted">{row.uid}</td>}
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {tab === 1 ? (
                        <>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => navigate(`/users/edit/${row.uid}`)}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            className="btn btn-blue btn-xs"
                            onClick={() => navigate(`/users/permissions/${row.uid}`, { state: { username: row.userName } })}
                          >
                            <Key size={12} /> Perms
                          </button>
                          <button
                            className="btn btn-ghost-danger btn-xs"
                            onClick={() => setDelId(row.uid)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleRestore(row.uid)}
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-body">
                <div className="confirm-icon danger"><Trash2 size={24} /></div>
                <div className="confirm-title">Delete User?</div>
                <p className="confirm-desc">This user will be deactivated. You can restore them later.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(delId)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}