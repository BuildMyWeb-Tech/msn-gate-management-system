import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { MapPin, RefreshCw, Plus, X, Save, Pencil, Trash2 } from "lucide-react";

const EMPTY = { uid:0, code:"", name:"", gpsId1:"", gpsId2:"", active:true };

function normalise(r) {
  return {
    uid:    Number(r.uid    ?? r.Uid    ?? r.UId    ?? 0),
    code:   r.gcode ?? r.GCode ?? r.code  ?? r.Code  ?? "",
    name:   r.gname ?? r.GName ?? r.name  ?? r.Name  ?? "",
    gpsId1: r.gpsid1?? r.GPSId1?? r.gpsId1?? "",
    gpsId2: r.gpsid2?? r.GPSId2?? r.gpsId2?? "",
    active: r.active ?? r.Active ?? true,
  };
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
    } catch { setToast({type:"error",msg:"Failed to load patrol points"}); }
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

  const onSave = async () => {
    if (!form.name?.trim()) { setErrors({name:"Name is required"}); return; }
    setSaving(true);
    try {
      const body = { code:form.code, name:form.name, gpsId1:form.gpsId1, gpsId2:form.gpsId2, uid:form.uid||0 };
      if (form.uid) await api.put(`/setup/patrol-points/${form.uid}`, body);
      else          await api.post("/setup/patrol-points", body);
      setToast({type:"success",msg:form.uid?"Updated":"Added"});
      setShowForm(false); load();
    } catch(err){ setToast({type:"error",msg:err.response?.data?.message||"Failed"}); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      {showForm&&(
        <>
          <div onClick={closeForm} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            zIndex:401,width:"min(440px,92vw)",background:"var(--surface)",
            borderRadius:"var(--radius)",border:"1px solid var(--border)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
                    value={form.name} onChange={onChange} placeholder="Patrol point name" autoFocus/>
                  {errors.name&&<div className="form-error">{errors.name}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GPS ID 1</label>
                  <input name="gpsId1" className="form-input" value={form.gpsId1} onChange={onChange} placeholder="Latitude"/>
                </div>
                <div className="form-group">
                  <label className="form-label">GPS ID 2</label>
                  <input name="gpsId2" className="form-input" value={form.gpsId2} onChange={onChange} placeholder="Longitude"/>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/>Save</>}
              </button>
            </div>
          </div>
        </>
      )}

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
          <button className="btn btn-primary" style={{marginTop:8}} onClick={openAdd}><Plus size={14}/> Add Point</button>
        </div>
      ):(
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{width:50}}>#</th>
              <th>Code</th>
              <th>Name</th>
              <th>GPS ID 1</th>
              <th>GPS ID 2</th>
              <th>Status</th>
              <th style={{width:80}}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={row.uid??i}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td className="td-muted" style={{textAlign:"center"}}>{i+1}</td>
                  <td className="td-muted">{row.code||"—"}</td>
                  <td style={{fontWeight:600}}>{row.name||"—"}</td>
                  <td className="td-muted">{row.gpsId1||"—"}</td>
                  <td className="td-muted">{row.gpsId2||"—"}</td>
                  <td>{row.active?<span className="badge badge-in">Active</span>:<span className="badge badge-out">Inactive</span>}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}>
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