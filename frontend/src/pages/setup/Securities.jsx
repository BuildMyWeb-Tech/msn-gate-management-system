import React, { useState, useEffect, useCallback, useRef } from "react";
import { useResponsive } from "../../hooks/useResponsive";
import { useSortableTable } from "../../hooks/useSortableTable";
import { usePagePerms } from "../../hooks/usePagePerms";
import Toast from "../../components/Toast";
import SortableHeader from "../../components/SortableHeader";
import api from "../../services/api";
import {
  Plus, Pencil, Trash2, RotateCcw, Save, X,
  RefreshCw, Search, Camera, BadgeCheck,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from "lucide-react";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const EMPTY_FORM = {
  code:"", name:"", gender:"", mobile1:"",
  mobile2:"", password:"", addr1:"", addr2:"",
  addr3:"", addr4:"", photo:"",
};

export default function Securities() {
  const { isMobile }                       = useResponsive();
  const { canWrite, canUpdate, canDelete } = usePagePerms();
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const [tab, setTab]           = useState(1);
  const [rows, setRows]         = useState([]);
  const [q, setQ]               = useState("");
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [delId, setDelId]       = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream]     = useState(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showPw, setShowPw]     = useState(false);

  // ── Load ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/setup/securities?tag=${tab}`);
      setRows(res.data?.data || []);
    } catch { setToast({ type:"error", msg:"Failed to load securities" }); }
    finally   { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = q ? rows.filter(r => (r.name||r.code||"").toLowerCase().includes(q.toLowerCase())) : rows;
  const { sorted, sortKey, sortDir, toggle } = useSortableTable(filtered, "code");

  // ── Panel open/close ─────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM); setEditId(null); setErrors({});
    setShowPhoto(false); setShowPw(false);
    setPanelOpen(true);
  };
  const openEdit = row => {
    setForm({
      code:row.code||"", name:row.name||"", gender:row.gender||"",
      mobile1:String(row.mobile1||""), mobile2:String(row.mobile2||""),
      password:row.password||"",
      addr1:row.addr1||"", addr2:row.addr2||"",
      addr3:row.addr3||"", addr4:row.addr4||"",
      photo:row.photo||"",
    });
    setEditId(row.uid); setErrors({});
    setShowPhoto(Boolean(row.photo)); setShowPw(false);
    setPanelOpen(true);
  };
  const closePanel = () => { setPanelOpen(false); setEditId(null); setErrors({}); closeCam(); };

  const onChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]:"" }));
  };

  // ── Camera ───────────────────────────────────────────────────
  const openCam = async () => {
    setShowPhoto(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"user" } });
      setStream(s); setCameraOn(true);
      setTimeout(() => { if(videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { setToast({ type:"error", msg:"Camera access denied" }); }
  };
  const capture = () => {
    const v=videoRef.current, c=canvasRef.current; if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setForm(p=>({...p, photo:c.toDataURL("image/jpeg",.75).split(",")[1]}));
    closeCam();
  };
  const closeCam = () => { if(stream) stream.getTracks().forEach(t=>t.stop()); setStream(null); setCameraOn(false); };

  // ── Validation ───────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.code.trim())    e.code    = "Code is required";
    if (!form.name.trim())    e.name    = "Name is required";
    if (!form.gender)         e.gender  = "Gender is required";
    if (!form.mobile1.trim()) e.mobile1 = "Mobile 1 is required";
    return e;
  };

  // ── Save ─────────────────────────────────────────────────────
  const onSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) await api.put(`/setup/securities/${editId}`, form);
      else        await api.post("/setup/securities", form);
      setToast({ type:"success", msg: editId ? "Updated successfully" : "Created successfully" });
      closePanel(); load();
    } catch(err) {
      setToast({ type:"error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  const onDelete = async uid => {
    try {
      await api.delete(`/setup/securities/${uid}`);
      setToast({ type:"success", msg:"Deleted successfully" });
      setDelId(null); setTimeout(() => load(), 400);
    } catch { setToast({ type:"error", msg:"Failed to delete" }); }
  };

  // ── Rendered form content (shared desktop+mobile) ────────────
  const FormContent = () => (
    <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", gap:16 }}>
      {/* Left — fields */}
      <div style={{ flex:1, minWidth:0 }}>

        <div className="form-group">
          <label className="form-label">Code <span className="req">*</span></label>
          <input name="code" className={`form-input ${errors.code?"err":""}`}
            value={form.code} onChange={onChange} placeholder="SEC-001"/>
          {errors.code && <div className="form-error">{errors.code}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Name <span className="req">*</span></label>
          <input name="name" className={`form-input ${errors.name?"err":""}`}
            value={form.name} onChange={onChange} placeholder="Full name"/>
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Gender <span className="req">*</span></label>
          <select name="gender" className={`form-input ${errors.gender?"err":""}`}
            value={form.gender} onChange={onChange}>
            <option value="">— Select Gender —</option>
            {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
          </select>
          {errors.gender && <div className="form-error">{errors.gender}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mobile 1 <span className="req">*</span></label>
            <input name="mobile1" className={`form-input ${errors.mobile1?"err":""}`}
              value={form.mobile1} onChange={onChange} placeholder="Primary mobile"
              inputMode="numeric"/>
            {errors.mobile1 && <div className="form-error">{errors.mobile1}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Mobile 2</label>
            <input name="mobile2" className="form-input"
              value={form.mobile2} onChange={onChange} placeholder="Secondary"
              inputMode="numeric"/>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="pw-wrap">
            <input name="password" type={showPw?"text":"password"} className="form-input"
              value={form.password} onChange={onChange} placeholder="Set password"
              style={{paddingRight:42}}/>
            <button type="button" className="pw-toggle" onClick={()=>setShowPw(s=>!s)}>
              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>

        <div style={{
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-sm)", padding:"12px 14px", marginBottom:14,
        }}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",
            letterSpacing:"0.07em",marginBottom:10}}>Address</div>
          <div className="form-group" style={{marginBottom:10}}>
            <input name="addr1" className="form-input" value={form.addr1} onChange={onChange}
              placeholder="Address line 1"/>
          </div>
          <div className="form-group" style={{marginBottom:10}}>
            <input name="addr2" className="form-input" value={form.addr2} onChange={onChange}
              placeholder="Address line 2"/>
          </div>
          <div className="form-row">
            <input name="addr3" className="form-input" value={form.addr3} onChange={onChange}
              placeholder="City / Area"/>
            <input name="addr4" className="form-input" value={form.addr4} onChange={onChange}
              placeholder="State / Pin"/>
          </div>
        </div>

        {/* Mobile: Photo toggle inside form */}
        {isMobile && (
          <div style={{marginBottom:14}}>
            <button className="btn btn-ghost"
              style={{width:"100%",justifyContent:"center"}}
              onClick={()=>setShowPhoto(s=>!s)}>
              <Camera size={15}/>
              {form.photo ? "View / Retake Photo" : "Add Photo"}
              {showPhoto ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {showPhoto && <div style={{marginTop:10}}><PhotoBox/></div>}
          </div>
        )}
      </div>

      {/* Right — Photo (desktop only) */}
      {!isMobile && (
        <div style={{width:170, flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text2)",
            textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Photo</div>
          <PhotoBox/>
        </div>
      )}
    </div>
  );

  const PhotoBox = () => (
    cameraOn ? (
      <div>
        <video ref={videoRef} autoPlay playsInline
          style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}>
            <Camera size={13}/> Capture
          </button>
          <button className="btn btn-ghost btn-sm" onClick={closeCam}>Cancel</button>
        </div>
      </div>
    ) : (
      <div>
        <div className="photo-box" onClick={openCam}
          style={{aspectRatio:isMobile?"4/3":"3/4"}}>
          {form.photo
            ? <img src={`data:image/jpeg;base64,${form.photo}`} alt="Security"/>
            : <><Camera size={24} style={{color:"var(--text3)"}}/><span className="photo-box-text">Tap to capture</span></>}
        </div>
        {form.photo && (
          <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:8}} onClick={openCam}>
            <Camera size={13}/> Retake
          </button>
        )}
      </div>
    )
  );

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{display:"flex",alignItems:"center",gap:8}}>
            <BadgeCheck size={20}/> Securities
          </h1>
          <p>{sorted.length} record{sorted.length!==1?"s":""} &bull; {tab===1?"Active":"Inactive"}</p>
        </div>
        <div className="page-hdr-actions">
          {canWrite && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={15}/> Add New
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="toolbar">
        <div className="toggle-tabs">
          <button className={`toggle-tab ${tab===1?"active":""}`} onClick={()=>setTab(1)}>Active</button>
          <button className={`toggle-tab ${tab===0?"active":""}`} onClick={()=>setTab(0)}>Inactive</button>
        </div>
        <div className="toolbar-search" style={{flex:1}}>
          <Search size={14} className="toolbar-search-icon"/>
          <input className="form-input" placeholder="Search securities..."
            value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
      </div>

      {/* ── Grid (always full width) ──────────────────────────── */}
      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : sorted.length===0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BadgeCheck size={22}/></div>
          <h3>No securities found</h3>
          <p>{tab===1?"No active records":"No inactive records"}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{width:40}}>#</th>
              {!isMobile && <th style={{width:56}}>Photo</th>}
              <SortableHeader label="Code"   colKey="code"    sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Name"   colKey="name"    sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Mobile" colKey="mobile1" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <SortableHeader label="Gender" colKey="gender" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <th style={{width:110}}>Action</th>
            </tr></thead>
            <tbody>
              {sorted.map((row,i)=>(
                <tr key={row.uid??i}>
                  <td className="td-muted">{i+1}</td>
                  {!isMobile && (
                    <td>
                      {row.photo
                        ? <img src={`data:image/jpeg;base64,${row.photo}`}
                            style={{width:36,height:36,borderRadius:6,objectFit:"cover"}} alt=""/>
                        : <div style={{width:36,height:36,background:"var(--surface2)",borderRadius:6,
                              display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <BadgeCheck size={14} style={{color:"var(--text3)"}}/>
                          </div>}
                    </td>
                  )}
                  <td><span className="badge-pass">{row.code||"—"}</span></td>
                  <td style={{fontWeight:600}}>{row.name||"—"}</td>
                  <td className="td-muted">{row.mobile1||"—"}</td>
                  {!isMobile && (
                    <td>
                      {row.gender && (
                        <span className={`badge ${row.gender==="Male"?"badge-blue":"badge-in"}`}>
                          {row.gender}
                        </span>
                      )}
                    </td>
                  )}
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      {tab===1 ? (
                        <>
                          {canUpdate && (
                            <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}>
                              <Pencil size={12}/> Edit
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-ghost-danger btn-xs" onClick={()=>setDelId(row.uid)}>
                              <Trash2 size={12}/>
                            </button>
                          )}
                        </>
                      ) : (
                        <button className="btn btn-ghost btn-xs">
                          <RotateCcw size={12}/> Restore
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

      {/* ══════════════════════════════════════════════════════
          PANEL — Desktop: right side drawer
                  Mobile:  bottom sheet
         ══════════════════════════════════════════════════════ */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePanel}
            style={{
              position:"fixed", inset:0,
              background:"rgba(0,0,0,0.55)",
              backdropFilter:"blur(3px)",
              zIndex:300,
              animation:"fadeIn .2s ease",
            }}
          />

          {/* Panel */}
          <div style={{
            position:"fixed",
            zIndex:301,
            background:"var(--surface)",
            boxShadow:"var(--shadow)",
            overflowY:"auto",
            animation: isMobile ? "slideUp .3s ease" : "slideRight .25s ease",
            // Desktop: right drawer
            ...(isMobile ? {
              left:0, right:0, bottom:0,
              maxHeight:"92dvh",
              borderRadius:"20px 20px 0 0",
              padding:"0 0 24px",
            } : {
              top:0, right:0, bottom:0,
              width: "min(680px, 90vw)",
              borderLeft:"1px solid var(--border)",
              padding:0,
            }),
          }}>
            {/* Panel header */}
            <div style={{
              position:"sticky", top:0,
              background:"var(--surface)",
              borderBottom:"1px solid var(--border)",
              padding: isMobile ? "16px 20px 14px" : "18px 24px",
              display:"flex", alignItems:"center",
              justifyContent:"space-between",
              zIndex:1,
              // Mobile: drag handle
            }}>
              {isMobile && (
                <div style={{
                  position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
                  width:40, height:4, borderRadius:2,
                  background:"var(--border2)",
                }}/>
              )}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:36,height:36,borderRadius:"var(--radius-sm)",
                  background:"var(--accent-dim)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  <BadgeCheck size={18} style={{color:"var(--accent)"}}/>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:16}}>
                    {editId ? "Edit Security" : "New Security"}
                  </div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:1}}>
                    {editId ? `Editing record` : "Fill in security details"}
                  </div>
                </div>
              </div>
              <button
                onClick={closePanel}
                style={{
                  width:32,height:32,borderRadius:"var(--radius-sm)",
                  background:"var(--surface2)",border:"1px solid var(--border)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer", color:"var(--text2)",
                  flexShrink:0,
                }}
              >
                <X size={16}/>
              </button>
            </div>

            {/* Panel body */}
            <div style={{padding: isMobile ? "16px 20px" : "20px 24px"}}>
              <FormContent/>
            </div>

            {/* Panel footer — sticky save/cancel */}
            <div style={{
              position:"sticky", bottom:0,
              background:"var(--surface)",
              borderTop:"1px solid var(--border)",
              padding: isMobile ? "12px 20px" : "14px 24px",
              display:"flex", gap:10,
            }}>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}
                style={{flex:1, padding:"11px"}}>
                {saving
                  ? <><span className="spin-sm" style={{borderColor:"rgba(0,0,0,.25)",borderTopColor:"#000"}}/>Saving...</>
                  : <><Save size={16}/>{editId?"Save Changes":"Create Security"}</>}
              </button>
              <button className="btn btn-ghost" onClick={closePanel} style={{padding:"11px 20px"}}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirm ─────────────────────────────────────── */}
      {delId && (
        <div className="modal-overlay" onClick={()=>setDelId(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-body">
                <div className="confirm-icon danger"><Trash2 size={24}/></div>
                <div className="confirm-title">Delete Security?</div>
                <p className="confirm-desc">This record will be moved to inactive.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>onDelete(delId)}>
                <Trash2 size={14}/> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}