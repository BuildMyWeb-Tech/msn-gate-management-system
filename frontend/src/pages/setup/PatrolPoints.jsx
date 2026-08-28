import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { MapPin, RefreshCw, Plus, X, Save, Pencil, Navigation, Loader } from "lucide-react";

const EMPTY = { uid:0, code:"", name:"", gpsId1:"", gpsId2:"" };

function normalise(r) {
  return {
    uid:    Number(r.uid    ?? r.Uid    ?? r.UId    ?? 0),
    code:   r.gcode ?? r.GCode ?? r.code  ?? "",
    name:   r.gname ?? r.GName ?? r.name  ?? "",
    gpsId1: r.gpsid1?? r.GPSId1?? r.gpsId1?? "",
    gpsId2: r.gpsid2?? r.GPSId2?? r.gpsId2?? "",
    active: r.active ?? r.Active ?? true,
  };
}

// ── GPS capture button ────────────────────────────────────────
function GPSButton({ onCapture }) {
  const [getting, setGetting] = useState(false);
  const [error, setError]     = useState("");

  const capture = () => {
    if (!navigator.geolocation) {
      setError("GPS not supported on this device");
      return;
    }
    setGetting(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        onCapture(lat, lng);
        setGetting(false);
      },
      (err) => {
        setGetting(false);
        if (err.code === 1) setError("Location permission denied — enable in browser settings");
        else if (err.code === 2) setError("Location unavailable — try outdoors");
        else setError("GPS timeout — try again");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div>
      <button type="button" onClick={capture} disabled={getting}
        style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"7px 12px",
          background:"var(--accent-dim)",
          border:"1px solid rgba(245,158,11,0.4)",
          borderRadius:"var(--radius-sm)",
          color:"var(--accent)", fontSize:12, fontWeight:600,
          cursor:getting?"wait":"pointer",
          transition:"all .15s",
          whiteSpace:"nowrap",
        }}
        onMouseEnter={e=>{if(!getting)e.currentTarget.style.background="rgba(245,158,11,0.2)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="var(--accent-dim)";}}>
        {getting
          ? <><Loader size={13} style={{animation:"spin 1s linear infinite"}}/> Getting GPS...</>
          : <><Navigation size={13}/> Use My Location</>}
      </button>
      {error && <div style={{fontSize:11,color:"var(--red)",marginTop:4}}>{error}</div>}
    </div>
  );
}

export default function PatrolPoints() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/setup/patrol-points");
      setRows((r.data?.data || []).map(normalise));
    } catch { setToast({type:"error", msg:"Failed to load patrol points"}); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(EMPTY); setErrors({}); setShowForm(true); };
  const openEdit = row => { setForm({...EMPTY,...row}); setErrors({}); setShowForm(true); };
  const closeForm = () => setShowForm(false);
  const onChange = e => {
    setForm(p=>({...p,[e.target.name]:e.target.value}));
    if(errors[e.target.name]) setErrors(p=>({...p,[e.target.name]:""}));
  };

  // Called when GPS button captures coordinates
  const onGPSCapture = (lat, lng) => {
    setForm(p => ({ ...p, gpsId1: lat, gpsId2: lng }));
    setToast({ type:"success", msg:`Location captured: ${lat}, ${lng}` });
  };

  const onSave = async () => {
    if (!form.name?.trim()) { setErrors({name:"Name is required"}); return; }
    setSaving(true);
    try {
      const body = {
        code:   form.code,
        name:   form.name,
        gpsId1: form.gpsId1,
        gpsId2: form.gpsId2,
        uid:    form.uid || 0,
      };
      if (form.uid) await api.put(`/setup/patrol-points/${form.uid}`, body);
      else          await api.post("/setup/patrol-points", body);
      setToast({type:"success", msg:form.uid?"Updated":"Added"});
      setShowForm(false); load();
    } catch(err) { setToast({type:"error", msg:err.response?.data?.message||"Failed"}); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      {/* Add/Edit Modal */}
      {showForm && (
        <>
          <div onClick={closeForm} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
          <div style={{
            position:"fixed", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            zIndex:401, width:"min(460px,92vw)",
            background:"var(--surface)",
            borderRadius:"var(--radius)",
            border:"1px solid var(--border)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.4)",
            maxHeight:"90dvh", overflowY:"auto",
          }}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"var(--surface)",zIndex:1}}>
              <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
                <MapPin size={16} style={{color:"var(--accent)"}}/>{form.uid?"Edit":"Add"} Patrol Point
              </div>
              <button onClick={closeForm} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
            </div>

            <div style={{padding:20}}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Code</label>
                  <input name="code" className="form-input" value={form.code} onChange={onChange} placeholder="PP01"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Name <span className="req">*</span></label>
                  <input name="name" className={`form-input ${errors.name?"err":""}`}
                    value={form.name} onChange={onChange} placeholder="e.g. Main Entrance" autoFocus/>
                  {errors.name&&<div className="form-error">{errors.name}</div>}
                </div>
              </div>

              {/* GPS Capture */}
              <div style={{
                padding:14, marginBottom:16,
                background:"var(--surface2)",
                border:"1px solid var(--border)",
                borderRadius:"var(--radius-sm)",
              }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                    <Navigation size={14} style={{color:"var(--accent)"}}/>GPS Coordinates
                  </div>
                  {/* One-tap GPS capture */}
                  <GPSButton onCapture={onGPSCapture}/>
                </div>

                {/* Show captured coords preview */}
                {(form.gpsId1 || form.gpsId2) && (
                  <div style={{
                    padding:"8px 10px", marginBottom:12,
                    background:"rgba(245,158,11,0.08)",
                    border:"1px solid rgba(245,158,11,0.2)",
                    borderRadius:"var(--radius-xs)",
                    fontSize:12, color:"var(--accent)",
                    display:"flex", alignItems:"center", gap:6,
                  }}>
                    <MapPin size={12}/>
                    <span>{form.gpsId1 && `Lat: ${form.gpsId1}`}{form.gpsId1 && form.gpsId2 && "  |  "}{form.gpsId2 && `Lng: ${form.gpsId2}`}</span>
                    {/* Google Maps link */}
                    {form.gpsId1 && form.gpsId2 && (
                      <a href={`https://www.google.com/maps?q=${form.gpsId1},${form.gpsId2}`}
                        target="_blank" rel="noreferrer"
                        style={{marginLeft:"auto",fontSize:11,color:"var(--accent)",textDecoration:"underline"}}>
                        View on Map ↗
                      </a>
                    )}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label" style={{fontSize:11}}>GPS ID 1 (Latitude)</label>
                    <input name="gpsId1" className="form-input" value={form.gpsId1}
                      onChange={onChange} placeholder="e.g. 11.004556"
                      inputMode="decimal"/>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label" style={{fontSize:11}}>GPS ID 2 (Longitude)</label>
                    <input name="gpsId2" className="form-input" value={form.gpsId2}
                      onChange={onChange} placeholder="e.g. 76.961632"
                      inputMode="decimal"/>
                  </div>
                </div>

                <div style={{fontSize:11,color:"var(--text3)",marginTop:10,lineHeight:1.5}}>
                  Tap <strong>Use My Location</strong> to auto-fill coordinates from device GPS,
                  or enter manually. Works best outdoors with good signal.
                </div>
              </div>
            </div>

            <div style={{padding:"12px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:8,justifyContent:"flex-end",position:"sticky",bottom:0,background:"var(--surface)"}}>
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/>Save</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Page header */}
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Patrol Points</h1>
          <p>{rows.length} point{rows.length!==1?"s":""}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Point</button>
        </div>
      </div>

      {loading?<div className="spinner-page"><div className="spinner"/></div>
      :rows.length===0?(
        <div className="empty-state">
          <div className="empty-icon"><MapPin size={22}/></div>
          <h3>No patrol points</h3>
          <p>Add patrol points with GPS coordinates for tracking</p>
          <button className="btn btn-primary" style={{marginTop:8}} onClick={openAdd}><Plus size={14}/> Add Point</button>
        </div>
      ):(
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{width:50}}>#</th>
              <th>Code</th>
              <th>Name</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th style={{width:120}}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={row.uid??i}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td className="td-muted" style={{textAlign:"center"}}>{i+1}</td>
                  <td className="td-muted">{row.code||"—"}</td>
                  <td style={{fontWeight:600}}>{row.name||"—"}</td>
                  <td className="td-muted" style={{fontFamily:"monospace",fontSize:12}}>{row.gpsId1||"—"}</td>
                  <td className="td-muted" style={{fontFamily:"monospace",fontSize:12}}>{row.gpsId2||"—"}</td>
                  <td>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}>
                        <Pencil size={11}/> Edit
                      </button>
                      {row.gpsId1 && row.gpsId2 && (
                        <a href={`https://www.google.com/maps?q=${row.gpsId1},${row.gpsId2}`}
                          target="_blank" rel="noreferrer"
                          style={{fontSize:11,color:"var(--accent)",textDecoration:"none",display:"flex",alignItems:"center",gap:3}}>
                          <MapPin size={11}/> Map
                        </a>
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
  );
}