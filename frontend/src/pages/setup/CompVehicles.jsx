import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { Plus, Search, Pencil, RefreshCw, Truck, X, Save } from "lucide-react";

const EMPTY = { vehicleNo:"", brand:"", driverName:"" };

// ── Form Modal ───────────────────────────────────────────────
function VehicleModal({ mode, initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const onChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]:"" }));
  };
  const validate = () => {
    const e = {};
    if (!form.vehicleNo.trim()) e.vehicleNo = "Vehicle No is required";
    if (!form.brand.trim())     e.brand     = "Brand is required";
    return e;
  };
  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        zIndex:401,width:"min(440px,92vw)",background:"var(--surface)",
        borderRadius:"var(--radius)",border:"1px solid var(--border)",
        boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
            <Truck size={16} style={{color:"var(--accent)"}}/>{mode==="add"?"Add":"Edit"} Company Vehicle
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
        </div>
        {/* Body */}
        <div style={{padding:"20px"}}>
          <div className="form-group">
            <label className="form-label">Vehicle No <span className="req">*</span></label>
            <input name="vehicleNo" className={`form-input ${errors.vehicleNo?"err":""}`}
              value={form.vehicleNo} onChange={onChange}
              placeholder="e.g. TN37DS1738" autoFocus/>
            {errors.vehicleNo&&<div className="form-error">{errors.vehicleNo}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Brand <span className="req">*</span></label>
            <input name="brand" className={`form-input ${errors.brand?"err":""}`}
              value={form.brand} onChange={onChange}
              placeholder="e.g. Wagon R"/>
            {errors.brand&&<div className="form-error">{errors.brand}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Driver Name</label>
            <input name="driverName" className="form-input"
              value={form.driverName} onChange={onChange}
              placeholder="Driver full name"/>
          </div>
        </div>
        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/>Save</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function CompVehicles() {
  const { user } = useAuth();
  const [rows, setRows]       = useState([]);
  const [q, setQ]             = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [modal, setModal]     = useState(null); // null | { mode:"add"|"edit", data }
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/comp-vehicles");
      setRows(r.data?.data || []);
    } catch { setToast({ type:"error", msg:"Failed to load company vehicles" }); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.vehicleNo||"").toLowerCase().includes(s) ||
           (r.brand||"").toLowerCase().includes(s) ||
           (r.driverName||"").toLowerCase().includes(s);
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await api.post("/comp-vehicles", form);
        setToast({ type:"success", msg:"Vehicle added successfully" });
      } else {
        await api.put(`/comp-vehicles/${modal.data.uid}`, form);
        setToast({ type:"success", msg:"Vehicle updated successfully" });
      }
      setModal(null);
      load();
    } catch (err) {
      setToast({ type:"error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)}/>

      {modal && (
        <VehicleModal
          mode={modal.mode}
          initial={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}/>
      )}

      {/* Page header */}
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Company Vehicles</h1>
          <p>{rows.length} vehicle{rows.length !== 1 ? "s" : ""} registered</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={14}/>
          </button>
          <button className="btn btn-primary" onClick={() => setModal({ mode:"add", data:EMPTY })}>
            <Plus size={15}/> Add Vehicle
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom:12, maxWidth:360, position:"relative" }}>
        <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text3)" }}/>
        <input className="form-input"
          placeholder="Search vehicle, brand or driver..."
          value={q} onChange={e => setQ(e.target.value)}
          style={{ paddingLeft:32 }}/>
        {q && (
          <button onClick={() => setQ("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text3)" }}>
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Table — matches image 2 layout: SlNo | Vehicle No | Brand | Driver Name */}
      {loading ? (
        <div className="spinner-page"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Truck size={22}/></div>
          <h3>{q ? "No results found" : "No company vehicles"}</h3>
          <p>{q ? `No matches for "${q}"` : "Add your first company vehicle"}</p>
          {!q && <button className="btn btn-primary" onClick={() => setModal({ mode:"add", data:EMPTY })}><Plus size={14}/> Add Vehicle</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width:60 }}>Sl.No</th>
                <th>Vehicle No</th>
                <th>Brand</th>
                <th>Driver Name</th>
                <th style={{ width:80 }}>Status</th>
                <th style={{ width:80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.uid ?? i}
                  onMouseEnter={e => e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background=""}>
                  <td className="td-muted" style={{ textAlign:"center" }}>
                    {row.serialNo || i + 1}
                  </td>
                  <td style={{ fontWeight:700, letterSpacing:"0.03em" }}>
                    {row.vehicleNo || "—"}
                  </td>
                  <td>{row.brand || "—"}</td>
                  <td>{row.driverName || "—"}</td>
                  <td>
                    {row.active
                      ? <span className="badge badge-in">Active</span>
                      : <span className="badge badge-out">Inactive</span>}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-xs"
                      onClick={() => setModal({ mode:"edit", data:{ ...row } })}>
                      <Pencil size={11}/> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}