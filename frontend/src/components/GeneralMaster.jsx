// components/GeneralMaster.jsx
// Reusable component for Gates and Designations
// Matches Image 2: grid left + inline form, Active/Inactive toggle, responsive columns
import React, { useState, useEffect, useCallback } from "react";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";
import Toast from "./Toast";
import {
  Plus, Pencil, Trash2, RotateCcw,
  Save, X, RefreshCw, Search,
} from "lucide-react";

export default function GeneralMaster({
  typeKey,        // "gates" | "designations"
  title,          // "Gates" | "Designations"
  gTypeMUid,      // 2=Gates, 1=Designations
  Icon,
  fields = [],    // [{ key, label, required, placeholder, spCol }]
  mobileColumns,  // keys to show on mobile
  desktopColumns, // keys to show on desktop
}) {
  const { isMobile } = useResponsive();
  const visibleCols = isMobile ? mobileColumns : desktopColumns;

  const [tab, setTab]         = useState(1);  // 1=active, 0=inactive
  const [rows, setRows]       = useState([]);
  const [q, setQ]             = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [form, setForm]       = useState({});
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState(null);
  const [delId, setDelId]     = useState(null);
  const [showForm, setShowForm] = useState(false);

  const blankForm = () => {
    const o = {};
    fields.forEach(f => { o[f.key] = ""; });
    return o;
  };

  // ── Load grid ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/setup/${typeKey}?tag=${tab}`);
      setRows(res.data?.data || []);
    } catch {
      setToast({ type: "error", msg: "Failed to load data" });
    } finally { setLoading(false); }
  }, [typeKey, tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = q
    ? rows.filter(r =>
        (r.name || r.code || "").toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  // ── Form handlers ────────────────────────────────────────────
  const openAdd = () => {
    setForm(blankForm());
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (row) => {
    const f = {};
    fields.forEach(fd => { f[fd.key] = row[fd.key] ?? ""; });
    setForm(f);
    setEditId(row.uid);
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const onChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    fields.filter(f => f.required).forEach(f => {
      if (!form[f.key]?.trim()) e[f.key] = `${f.label} is required`;
    });
    return e;
  };

  const onSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/setup/${typeKey}/${editId}`, form);
        setToast({ type: "success", msg: "Updated successfully" });
      } else {
        await api.post(`/setup/${typeKey}`, form);
        setToast({ type: "success", msg: "Created successfully" });
      }
      closeForm();
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  const onDelete = async (uid) => {
    try {
      await api.delete(`/setup/${typeKey}/${uid}`);
      setToast({ type: "success", msg: "Deleted successfully" });
      setDelId(null);
      load();
    } catch {
      setToast({ type: "error", msg: "Failed to delete" });
    }
  };

  const onRestore = async (uid) => {
    try {
      await api.patch(`/setup/${typeKey}/${uid}/restore`);
      setToast({ type: "success", msg: "Restored successfully" });
      load();
    } catch {
      setToast({ type: "error", msg: "Failed to restore" });
    }
  };

  // ── Column label map ─────────────────────────────────────────
  const fieldMap = Object.fromEntries(fields.map(f => [f.key, f]));

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Icon && <Icon size={20} />}
            {title}
          </h1>
          <p>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} &bull;{" "}
            {tab === 1 ? "Active" : "Inactive"}
          </p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add New
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toggle-tabs">
          <button
            className={`toggle-tab ${tab === 1 ? "active" : ""}`}
            onClick={() => setTab(1)}
          >Active</button>
          <button
            className={`toggle-tab ${tab === 0 ? "active" : ""}`}
            onClick={() => setTab(0)}
          >Inactive</button>
        </div>
        <div className="toolbar-search" style={{ flex: 1 }}>
          <Search size={14} className="toolbar-search-icon" />
          <input
            className="form-input"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Grid + Inline Form layout */}
      <div className={showForm && !isMobile ? "setup-grid" : ""}>

        {/* Grid */}
        <div>
          {loading ? (
            <div className="spinner-page"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icon && <Icon size={22} />}</div>
              <h3>No {title.toLowerCase()} found</h3>
              <p>{tab === 1 ? "No active records" : "No inactive records"}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    {/* Render only columns for current device */}
                    {visibleCols.map(key => (
                      <th key={key}>{fieldMap[key]?.label ?? key}</th>
                    ))}
                    <th style={{ width: 100 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={row.uid ?? i}>
                      <td className="td-muted">{i + 1}</td>
                      {visibleCols.map(key => (
                        <td key={key} style={key === "name" ? { fontWeight: 600 } : {}}>
                          {row[key] || "—"}
                        </td>
                      ))}
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {tab === 1 ? (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil size={12} /> Edit
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
                              onClick={() => onRestore(row.uid)}
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
        </div>

        {/* Inline Form — slides in on right */}
        {showForm && (
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  {Icon && <Icon size={15} />}
                  {editId ? "Edit" : "New"} {title.replace(/s$/, "")}
                </span>
                <button className="modal-close" onClick={closeForm}>
                  <X size={16} />
                </button>
              </div>

              {fields.map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">
                    {f.label}
                    {f.required && <span className="req"> *</span>}
                  </label>
                  <input
                    name={f.key}
                    className={`form-input ${errors[f.key] ? "err" : ""}`}
                    value={form[f.key] ?? ""}
                    onChange={onChange}
                    placeholder={f.placeholder || f.label}
                  />
                  {errors[f.key] && (
                    <div className="form-error">{errors[f.key]}</div>
                  )}
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={onSave}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving
                    ? <><span className="spin-sm" />Saving...</>
                    : <><Save size={14} />Save</>}
                </button>
                <button className="btn btn-ghost" onClick={closeForm}>
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-body">
                <div className="confirm-icon danger">
                  <Trash2 size={24} />
                </div>
                <div className="confirm-title">Delete Record?</div>
                <p className="confirm-desc">
                  This record will be moved to inactive. You can restore it later.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => onDelete(delId)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}