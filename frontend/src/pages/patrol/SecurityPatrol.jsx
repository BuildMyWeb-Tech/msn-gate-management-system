import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { getPatrolLogs, markCheckpoint } from "../../services/patrolService";
import { getDropdown } from "../../services/setupService";
import Toast from "../../components/Toast";
import { Shield, MapPin, Plus, RefreshCw, Clock, CheckCircle2, Search } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtDateTime = v => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return v; }
};

export default function SecurityPatrol() {
  const { user } = useAuth();
  const [date, setDate]     = useState(today());
  const [logs, setLogs]     = useState([]);
  const [locations, setLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ locationId: "", remarks: "" });
  const [marking, setMarking] = useState(false);
  const [q, setQ]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPatrolLogs(date);
      setLogs(r.data || []);
    } catch { setToast({ type: "error", msg: "Failed to load patrol logs" }); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getDropdown("locations")
      .then(r => { if (r?.data) setLocs(r.data); })
      .catch(() => {});
  }, []);

  const filtered = q
    ? logs.filter(l => (l.LocationName || l.locationName || "").toLowerCase().includes(q.toLowerCase()))
    : logs;

  const handleMark = async () => {
    if (!form.locationId) { setToast({ type: "error", msg: "Please select a location" }); return; }
    setMarking(true);
    try {
      await markCheckpoint({ locationId: form.locationId, remarks: form.remarks });
      setToast({ type: "success", msg: "Checkpoint marked successfully" });
      setShowForm(false);
      setForm({ locationId: "", remarks: "" });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to mark checkpoint" });
    } finally { setMarking(false); }
  };

  const selectedLoc = locations.find(l => String(l.id) === String(form.locationId));

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={22} /> Security Patrol
          </h1>
          <p>{filtered.length} checkpoint{filtered.length !== 1 ? "s" : ""} logged • {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={15} /> Mark Checkpoint
          </button>
        </div>
      </div>

      {/* Mark checkpoint form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" }}>
          <div className="card-header">
            <span className="card-title"><MapPin size={15} />Mark Checkpoint Visited</span>
            <button className="modal-close" onClick={() => setShowForm(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location / Checkpoint <span className="req">*</span></label>
              <select
                className="form-input"
                value={form.locationId}
                onChange={e => setForm(p => ({ ...p, locationId: e.target.value }))}
              >
                <option value="">— Select Location —</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <input
                className="form-input"
                placeholder="e.g. All clear"
                value={form.remarks}
                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
              />
            </div>
          </div>

          {selectedLoc && (
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13 }}>Marking: <strong>{selectedLoc.name}</strong></span>
              <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: "auto" }}>
                Guard: {user?.userName} · Gate: {user?.gateName || user?.gateId}
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleMark} disabled={marking}>
              {marking
                ? <><span className="spin-sm" style={{ borderColor: "rgba(0,0,0,0.25)", borderTopColor: "#000" }} />Marking...</>
                : <><CheckCircle2 size={15} />Mark Visited</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input type="date" className="date-input" value={date} onChange={e => setDate(e.target.value)} />
        <div className="toolbar-search" style={{ flex: 1 }}>
          <Search size={14} className="toolbar-search-icon" />
          <input className="form-input" placeholder="Search location..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>

      {loading ? (
        <div className="spinner-page"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Shield size={22} /></div>
          <h3>No patrol logs</h3>
          <p>No checkpoints marked for {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
        </div>
      ) : (
        <div>
          <div className="section-title" style={{ marginBottom: 14 }}>Patrol Log Timeline</div>
          {filtered.map((log, i) => {
            const loc     = log.LocationName || log.locationName || "—";
            const guard   = log.GuardName    || log.guardName    || user?.userName || "—";
            const gate    = log.GateName     || log.gateName     || "—";
            const time    = fmtDateTime(log.VisitedAt || log.visitedAt);
            const remarks = log.Remarks      || log.remarks      || "";
            return (
              <div key={i} className="patrol-log-item">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div className="patrol-log-dot" />
                  {i < filtered.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "var(--border)", minHeight: 20 }} />
                  )}
                </div>
                <div className="patrol-log-info">
                  <div className="patrol-log-location" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={13} style={{ color: "var(--accent)" }} />
                    {loc}
                  </div>
                  <div className="patrol-log-meta">
                    Guard: {guard}
                    {gate !== "—" && <> · Gate: {gate}</>}
                    {remarks && <> · <em style={{ color: "var(--text2)" }}>{remarks}</em></>}
                  </div>
                </div>
                <div className="patrol-log-time">
                  <Clock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  {time}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
