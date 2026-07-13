import React, { useState, useEffect, useCallback, useRef } from "react";
import { useResponsive } from "../hooks/useResponsive";
import { getSetup, createSetup, updateSetup, deleteSetup, restoreSetup } from "../services/setupService";
import Toast from "./Toast";
import { Plus, Pencil, Trash2, RotateCcw, Save, X, Camera, RefreshCw, Search } from "lucide-react";

export default function GeneralSetup({ typeKey, title, Icon, fields = [] }) {
  const { isMobile } = useResponsive();
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const [tab, setTab]     = useState(1);
  const [rows, setRows]   = useState([]);
  const [q, setQ]         = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm]   = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId]   = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream]     = useState(null);
  const [showForm, setShowForm] = useState(false);

  const hasPhoto = fields.some(f => f.key === "photo");

  const blankForm = () => {
    const o = {};
    fields.forEach(f => { o[f.key] = ""; });
    return o;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getSetup(typeKey, tab); setRows(r.data || []); }
    catch { setToast({ type: "error", msg: "Failed to load data" }); }
    finally { setLoading(false); }
  }, [typeKey, tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = q ? rows.filter(r => (r.name||r.code||"").toLowerCase().includes(q.toLowerCase())) : rows;

  const openAdd = () => { setForm(blankForm()); setEditId(null); setErrors({}); setShowForm(true); };
  const openEdit = row => { const f = {}; fields.forEach(fd => { f[fd.key] = row[fd.key] || row[fd.responseKey] || ""; }); setForm(f); setEditId(row.uid); setErrors({}); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); closeCam(); };

  const onChange = e => { const{name,value}=e.target; setForm(p=>({...p,[name]:value})); if(errors[name]) setErrors(p=>({...p,[name]:""})); };

  const validate = () => { const e = {}; fields.filter(f=>f.required).forEach(f=>{ if(!form[f.key]?.trim()) e[f.key]=`${f.label} is required`; }); return e; };

  const onSave = async () => {
    const errs = validate(); if(Object.keys(errs).length){ setErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) await updateSetup(typeKey, editId, form);
      else        await createSetup(typeKey, form);
      setToast({ type:"success", msg: editId ? "Updated successfully" : "Created successfully" });
      closeForm(); load();
    } catch(err) { setToast({ type:"error", msg: err.response?.data?.message || "Failed to save" }); }
    finally { setSaving(false); }
  };

  const onDelete = async id => {
    try { await deleteSetup(typeKey, id); setToast({ type:"success", msg:"Deleted" }); setDelId(null); load(); }
    catch { setToast({ type:"error", msg:"Failed to delete" }); }
  };

  const onRestore = async id => {
    try { await restoreSetup(typeKey, id); setToast({ type:"success", msg:"Restored" }); load(); }
    catch { setToast({ type:"error", msg:"Failed to restore" }); }
  };

  const openCam = async () => {
    try { const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); setStream(s); setCameraOn(true); setTimeout(()=>{ if(videoRef.current) videoRef.current.srcObject=s; },100); }
    catch { setToast({type:"error",msg:"Camera access denied"}); }
  };
  const capture = () => {
    const v=videoRef.current,c=canvasRef.current; if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight; c.getContext("2d").drawImage(v,0,0);
    setForm(p=>({...p,photo:c.toDataURL("image/jpeg",.75).split(",")[1]})); closeCam();
  };
  const closeCam = () => { if(stream) stream.getTracks().forEach(t=>t.stop()); setStream(null); setCameraOn(false); };

  const gridCols = hasPhoto
    ? ["Photo","Code","Name",...fields.filter(f=>!["code","name","photo"].includes(f.key)).map(f=>f.label),"Actions"]
    : ["#","Code","Name",...fields.filter(f=>!["code","name"].includes(f.key)).map(f=>f.label),"Actions"];

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{display:"flex",alignItems:"center",gap:8}}>{Icon&&<Icon size={20}/>}{title}</h1>
          <p>{filtered.length} record{filtered.length!==1?"s":""} • {tab===1?"Active":"Inactive"}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add New</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toggle-tabs">
          <button className={`toggle-tab ${tab===1?"active":""}`} onClick={()=>setTab(1)}>Active</button>
          <button className={`toggle-tab ${tab===0?"active":""}`} onClick={()=>setTab(0)}>Inactive</button>
        </div>
        <div className="toolbar-search" style={{flex:1}}>
          <Search size={14} className="toolbar-search-icon"/>
          <input className="form-input" placeholder={`Search ${title.toLowerCase()}...`} value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/>Refresh</button>
      </div>

      <div className={showForm&&!isMobile ? "setup-grid" : ""}>
        {/* Grid */}
        <div>
          {loading ? <div className="spinner-page"><div className="spinner"/></div>
          : filtered.length===0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icon&&<Icon size={22}/>}</div>
              <h3>No {title.toLowerCase()} found</h3>
              <p>{tab===1?"No active records":"No inactive records"}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  {hasPhoto ? <th style={{width:56}}>Photo</th> : <th style={{width:40}}>#</th>}
                  <th>Code</th>
                  <th>Name</th>
                  {fields.filter(f=>!["code","name","photo"].includes(f.key)).map(f=>(
                    <th key={f.key} className={f.mobileHide?"mobile-hide":""}>{f.label}</th>
                  ))}
                  <th style={{width:120}}>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((row,i)=>(
                    <tr key={row.uid||i}>
                      {hasPhoto
                        ? <td>{row.photo ? <img src={`data:image/jpeg;base64,${row.photo}`} style={{width:36,height:36,borderRadius:6,objectFit:"cover"}}/> : <div style={{width:36,height:36,background:"var(--surface2)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}><Camera size={14} style={{color:"var(--text3)"}}/></div>}</td>
                        : <td className="td-muted">{i+1}</td>
                      }
                      <td><span className="badge-pass">{row.code||"—"}</span></td>
                      <td style={{fontWeight:600}}>{row.name||"—"}</td>
                      {fields.filter(f=>!["code","name","photo"].includes(f.key)).map(f=>(
                        <td key={f.key} className={f.mobileHide?"mobile-hide":""}>
                          {row[f.responseKey||f.key]||row[f.key]||"—"}
                        </td>
                      ))}
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          {tab===1 ? (
                            <>
                              <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}><Pencil size={12}/>Edit</button>
                              <button className="btn btn-ghost-danger btn-xs" onClick={()=>setDelId(row.uid)}><Trash2 size={12}/></button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-xs" onClick={()=>onRestore(row.uid)}><RotateCcw size={12}/>Restore</button>
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
                <span className="card-title">{Icon&&<Icon size={15}/>}{editId?"Edit":"New"} {title.replace(/s$/,"")}</span>
                <button className="modal-close" onClick={closeForm}><X size={16}/></button>
              </div>

              {fields.filter(f=>f.key!=="photo").map(f=>(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}{f.required&&<span className="req">*</span>}</label>
                  {f.type==="select" ? (
                    <select name={f.key} className="form-input" value={form[f.key]||""} onChange={onChange}>
                      <option value="">— Select —</option>
                      {(f.options||[]).map(o=><option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input name={f.key} className={`form-input ${errors[f.key]?"err":""}`} value={form[f.key]||""} onChange={onChange} placeholder={f.placeholder||f.label}/>
                  )}
                  {errors[f.key]&&<div className="form-error">{errors[f.key]}</div>}
                </div>
              ))}

              {hasPhoto && (
                <div className="form-group">
                  <label className="form-label">Photo</label>
                  {cameraOn ? (
                    <div>
                      <video ref={videoRef} autoPlay playsInline style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
                      <div style={{display:"flex",gap:8,marginTop:8}}>
                        <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/>Capture</button>
                        <button className="btn btn-ghost btn-sm" onClick={closeCam}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="photo-box" onClick={openCam} style={{aspectRatio:"1"}}>
                      {form.photo ? <img src={`data:image/jpeg;base64,${form.photo}`} alt=""/> : <><Camera size={24} style={{color:"var(--text3)"}}/><span className="photo-box-text">Tap to capture</span></>}
                    </div>
                  )}
                </div>
              )}

              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{flex:1}}>
                  {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/>Save</>}
                </button>
                <button className="btn btn-ghost" onClick={closeForm}><X size={14}/>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {delId && (
        <div className="modal-overlay" onClick={()=>setDelId(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-body">
                <div className="confirm-icon danger"><Trash2 size={24}/></div>
                <div className="confirm-title">Delete Record?</div>
                <p className="confirm-desc">This record will be moved to inactive. You can restore it later.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>onDelete(delId)}><Trash2 size={14}/>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
