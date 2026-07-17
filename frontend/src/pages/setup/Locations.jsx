import React, { useState, useEffect, useCallback } from "react";
import { useResponsive } from "../../hooks/useResponsive";
import { useSortableTable } from "../../hooks/useSortableTable";
import api from "../../services/api";
import Toast from "../../components/Toast";
import SortableHeader from "../../components/SortableHeader";
import { MapPin, Plus, Pencil, Trash2, RotateCcw, Save, X, RefreshCw, Search, Navigation } from "lucide-react";

const EMPTY = { code: "", name: "", gpsId1: "", gpsId2: "" };

export default function Locations() {
  const { isMobile }  = useResponsive();
  const [tab, setTab] = useState(1);
  const [rows, setRows]         = useState([]);
  const [q, setQ]               = useState("");
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [delId, setDelId]       = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`/setup/locations?tag=${tab}`); setRows(r.data?.data || []); }
    catch { setToast({ type: "error", msg: "Failed to load locations" }); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = q ? rows.filter(r => (r.name || r.code || "").toLowerCase().includes(q.toLowerCase())) : rows;
  const { sorted, sortKey, sortDir, toggle } = useSortableTable(filtered, "code");

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setErrors({}); setShowForm(true); };
  const openEdit = row => { setForm({ code: row.code||"", name: row.name||"", gpsId1: row.gpsId1||"", gpsId2: row.gpsId2||"" }); setEditId(row.uid); setErrors({}); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); setErrors({}); };
  const onChange  = e => { const{name,value}=e.target; setForm(p=>({...p,[name]:value})); if(errors[name]) setErrors(p=>({...p,[name]:""})); };

  // Get GPS coordinates from device
  const getLocation = () => {
    if (!navigator.geolocation) { setToast({ type: "error", msg: "Geolocation not supported on this device" }); return; }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm(p => ({ ...p, gpsId1: String(lat), gpsId2: String(lng) }));
        setGettingGps(false);
        setToast({ type: "success", msg: `GPS captured: ${lat}, ${lng}` });
      },
      err => {
        setGettingGps(false);
        setToast({ type: "error", msg: "GPS error: " + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Location code is required";
    if (!form.name.trim()) e.name = "Location name is required";
    return e;
  };

  const onSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) await api.put(`/setup/locations/${editId}`, form);
      else        await api.post("/setup/locations", form);
      setToast({ type: "success", msg: editId ? "Updated successfully" : "Created successfully" });
      closeForm(); load();
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  const onDelete = async uid => {
    try {
      await api.delete(`/setup/locations/${uid}`);
      setToast({ type: "success", msg: "Deleted successfully" });
      setDelId(null);
      // Small delay to ensure DB commits before re-fetching
      setTimeout(() => load(), 400);
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to delete" });
    }
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={20} /> Locations</h1>
          <p>{sorted.length} record{sorted.length !== 1 ? "s" : ""} • {tab === 1 ? "Active" : "Inactive"}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add New</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toggle-tabs">
          <button className={`toggle-tab ${tab === 1 ? "active" : ""}`} onClick={() => setTab(1)}>Active</button>
          <button className={`toggle-tab ${tab === 0 ? "active" : ""}`} onClick={() => setTab(0)}>Inactive</button>
        </div>
        <div className="toolbar-search" style={{ flex: 1 }}>
          <Search size={14} className="toolbar-search-icon" />
          <input className="form-input" placeholder="Search locations..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className={showForm && !isMobile ? "setup-grid" : ""}>
        {/* Grid */}
        <div>
          {loading ? <div className="spinner-page"><div className="spinner" /></div>
          : sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><MapPin size={22} /></div>
              <h3>No locations found</h3>
              <p>{tab === 1 ? "No active records" : "No inactive records"}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <SortableHeader label="Code"     colKey="code"  sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableHeader label="Location" colKey="name"  sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    {!isMobile && <SortableHeader label="GPS Id 1" colKey="gpsId1" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />}
                    {!isMobile && <SortableHeader label="GPS Id 2" colKey="gpsId2" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />}
                    <th style={{ width: 110 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={row.uid ?? i}>
                      <td className="td-muted">{i + 1}</td>
                      <td><span className="badge-pass">{row.code || "—"}</span></td>
                      <td style={{ fontWeight: 600 }}>{row.name || "—"}</td>
                      {!isMobile && <td className="td-muted">{row.gpsId1 || "—"}</td>}
                      {!isMobile && <td className="td-muted">{row.gpsId2 || "—"}</td>}
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {tab === 1 ? (
                            <>
                              <button className="btn btn-ghost btn-xs" onClick={() => openEdit(row)}><Pencil size={12} /> Edit</button>
                              <button className="btn btn-ghost-danger btn-xs" onClick={() => setDelId(row.uid)}><Trash2 size={12} /></button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-xs" onClick={() => setToast({ type: "error", msg: "Restore not available for locations" })}><RotateCcw size={12} /> Restore</button>
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

        {/* Inline form */}
        {showForm && (
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title"><MapPin size={15} />{editId ? "Edit" : "New"} Location</span>
                <button className="modal-close" onClick={closeForm}><X size={16} /></button>
              </div>

              <div className="form-group">
                <label className="form-label">Code <span className="req">*</span></label>
                <input name="code" className={`form-input ${errors.code ? "err" : ""}`}
                  value={form.code} onChange={onChange} placeholder="LOC-001" />
                {errors.code && <div className="form-error">{errors.code}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Location <span className="req">*</span></label>
                <input name="name" className={`form-input ${errors.name ? "err" : ""}`}
                  value={form.name} onChange={onChange} placeholder="e.g. Server Room" />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>

              {/* Get Location button */}
              <button
                onClick={getLocation}
                disabled={gettingGps}
                style={{
                  width: "100%", padding: "9px 14px", marginBottom: 12,
                  background: "var(--accent)", color: "#000",
                  border: "none", borderRadius: "var(--radius-sm)",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: gettingGps ? 0.7 : 1,
                }}
              >
                {gettingGps
                  ? <><span className="spin-sm" style={{ borderColor: "rgba(0,0,0,.25)", borderTopColor: "#000" }} />Getting GPS...</>
                  : <><Navigation size={15} />Get Location</>}
              </button>

              <div className="form-group">
                <label className="form-label">GPS Id 1 <span style={{ fontSize: 11, color: "var(--text3)" }}>(Latitude)</span></label>
                <input name="gpsId1" className="form-input" value={form.gpsId1} onChange={onChange} placeholder="e.g. 13.082680" />
              </div>

              <div className="form-group">
                <label className="form-label">GPS Id 2 <span style={{ fontSize: 11, color: "var(--text3)" }}>(Longitude)</span></label>
                <input name="gpsId2" className="form-input" value={form.gpsId2} onChange={onChange} placeholder="e.g. 80.270718" />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ flex: 1 }}>
                  {saving ? <><span className="spin-sm" />Saving...</> : <><Save size={14} />Save</>}
                </button>
                <button className="btn btn-ghost" onClick={closeForm}><X size={14} /> Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-body">
                <div className="confirm-icon danger"><Trash2 size={24} /></div>
                <div className="confirm-title">Delete Location?</div>
                <p className="confirm-desc">This location will be removed from active records.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => onDelete(delId)}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}