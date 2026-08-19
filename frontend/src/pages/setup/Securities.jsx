import React, { useState, useEffect, useRef, useCallback } from "react";
import { uploadSecurityPhoto } from "../../services/photoService";
import Toast from "../../components/Toast";
import api from "../../services/api";
import { Plus, Pencil, Trash2, X, Save, Camera, Eye, RefreshCw, Shield } from "lucide-react";

// Column names from PR_GetSecurityData_FrontGrid — exact case from SP
function normalise(r) {
  return {
    uid:       Number(r.UId      ?? r.uid      ?? r.Uid      ?? 0),
    scode:     r.SCode   ?? r.scode   ?? r.Scode   ?? "",
    sname:     r.SName   ?? r.sname   ?? r.Sname   ?? "",
    gender:    r.Gender  ?? r.gender  ?? "",
    smobile1:  r.Smobile1?? r.smobile1?? r.SMobile1?? r.SMobile ?? "",
    smobile2:  r.SMobile2?? r.smobile2?? "",
    address1:  r.Address1?? r.address1?? "",
    address2:  r.Address2?? r.address2?? "",
    address3:  r.Address3?? r.address3?? "",
    address4:  r.Address4?? r.address4?? "",
    address5:  r.Address5?? r.address5?? "",
    spassword: r.SPassword??r.spassword??"",
    photo:     r.PhotoPath??r.photopath??r.photo??"",
    active:    r.Active  ?? r.active  ?? true,
  };
}

const EMPTY = {
  uid:0, scode:"", sname:"", gender:"", smobile1:"", smobile2:"",
  spassword:"", address1:"", address2:"", address3:"", address4:"", address5:"",
  photo:"", photoUrl:"", active:true,
};

function getPhotoSrc(p) {
  if (!p) return null;
  const s = String(p).trim();
  if (!s || s === "/Security/" || s.startsWith("/Security/")) return null;
  if (s.startsWith("http")) return s;
  if (s.startsWith("data:")) return s;
  if (s.length > 100) return `data:image/jpeg;base64,${s}`;
  return null;
}

function PhotoStamp({ photo, name, size=32 }) {
  const src = getPhotoSrc(photo);
  const initials = (name||"S").slice(0,2).toUpperCase();
  if (src) return <img src={src} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"1.5px solid var(--accent)"}} onError={e=>e.target.style.display="none"}/>;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid var(--border2)",flexShrink:0}}>
      <span style={{fontSize:size*0.33,fontWeight:700,color:"var(--accent)"}}>{initials}</span>
    </div>
  );
}

function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
      .then(s=>{setStream(s);if(videoRef.current)videoRef.current.srcObject=s;})
      .catch(()=>onCancel());
    return ()=>stream?.getTracks().forEach(t=>t.stop());
  },[]);
  const capture = () => {
    const v=videoRef.current; if(!v)return;
    const c=document.createElement("canvas");
    c.width=v.videoWidth||640; c.height=v.videoHeight||480;
    c.getContext("2d").drawImage(v,0,0);
    const b64=c.toDataURL("image/jpeg",0.8).split(",")[1];
    stream?.getTracks().forEach(t=>t.stop());
    onCapture(b64);
  };
  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/> Capture</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={13}/> Cancel</button>
      </div>
    </div>
  );
}

export default function Securities() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [viewRow, setViewRow]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/setup/securities");
      const raw = r.data?.data || [];
      setRows(raw.map(normalise));
    } catch { setToast({type:"error",msg:"Failed to load securities"}); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{load();},[load]);

  const openNew  = () => { setForm(EMPTY); setErrors({}); setCameraOn(false); setShowForm(true); };
  const openEdit = row => {
    setForm({
      ...EMPTY, ...row,
      photoUrl: getPhotoSrc(row.photo) ? row.photo : "",
      photo: "",
    });
    setErrors({}); setCameraOn(false); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setCameraOn(false); };
  const onChange  = e => {
    const{name,value}=e.target;
    setForm(p=>({...p,[name]:value}));
    if(errors[name])setErrors(p=>({...p,[name]:""}));
  };

  const handleCapture = async (base64) => {
    setCameraOn(false);
    setUploading(true);
    setToast({type:"info",msg:"Uploading photo..."});
    try {
      const url = await uploadSecurityPhoto(base64, form.uid||"new");
      setForm(p=>({...p,photo:"",photoUrl:url}));
      setToast({type:"success",msg:"Photo uploaded ✓"});
    } catch {
      setForm(p=>({...p,photo:base64}));
      setToast({type:"error",msg:"Upload failed — photo saved locally"});
    } finally { setUploading(false); }
  };

  const validate = () => {
    const e={};
    if(!form.sname.trim()) e.sname="Name is required";
    if(!form.gender)       e.gender="Gender is required";
    return e;
  };

  const onSave = async () => {
    const errs=validate();
    if(Object.keys(errs).length){setErrors(errs);return;}
    setSaving(true);
    try {
      const now = new Date();
      const localNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}.${String(now.getMilliseconds()).padStart(3,"0")}`;

      // Build JSON matching PR_IUD_Security exact format
      const payload = JSON.stringify({
        UId:        form.uid || 0,      // 0=add, existing uid=edit
        SCode:      form.scode     || "",
        SName:      form.sname     || "",
        Gender:     form.gender    || "",
        Smobile1:   form.smobile1  ? Number(String(form.smobile1).replace(/\D/g,"")) : 0,
        SMobile2:   form.smobile2  ? Number(String(form.smobile2).replace(/\D/g,"")) : 0,
        SPassword:  form.spassword || "",
        Address1:   form.address1  || "",
        Address2:   form.address2  || "",
        Address3:   form.address3  || null,
        Address4:   form.address4  || null,
        Address5:   form.address5  || null,
        PhotoPath:  form.photoUrl  || form.photo || "/Security/",
        Active:     form.active !== false ? 1 : 0,
        Companyid:  1,
        CreatedBy:  1,
        CreatedOn:  localNow,
        DeletedBy:  null,
        DeletedOn:  null,
      });

      await api.post("/setup/securities", { json: payload });
      setToast({type:"success",msg:form.uid?"Security updated":"Security added"});
      closeForm(); load();
    } catch(err){
      setToast({type:"error",msg:err.response?.data?.message||"Failed to save"});
    } finally{setSaving(false);}
  };

  const onDelete = async uid => {
    if(!confirm("Delete this security record?")) return;
    try { await api.delete(`/setup/securities/${uid}`); setToast({type:"success",msg:"Deleted"}); load(); }
    catch { setToast({type:"error",msg:"Failed to delete"}); }
  };

  const photoSrc = form.photoUrl
    ? form.photoUrl
    : form.photo ? `data:image/jpeg;base64,${form.photo}` : null;

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Securities</h1>
          <p>{rows.length} record{rows.length!==1?"s":""}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15}/> New Security</button>
        </div>
      </div>

      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : rows.length===0 ? (
        <div className="empty-state"><div className="empty-icon"><Shield size={22}/></div><h3>No security records</h3></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Code</th>
              <th>Gender</th>
              <th>Mobile</th>
              <th>Status</th>
              <th style={{width:150}}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(row=>(
                <tr key={row.uid}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td><PhotoStamp photo={row.photo} name={row.sname}/></td>
                  <td style={{fontWeight:600}}>{row.sname||"—"}</td>
                  <td className="td-muted">{row.scode||"—"}</td>
                  <td>{row.gender||"—"}</td>
                  <td className="td-muted">{row.smobile1||"—"}</td>
                  <td>{row.active?<span className="badge badge-in">Active</span>:<span className="badge badge-out">Inactive</span>}</td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)}><Eye size={11}/> View</button>
                      <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}><Pencil size={11}/> Edit</button>
                      <button className="btn btn-ghost-danger btn-xs" onClick={()=>onDelete(row.uid)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form drawer */}
      {showForm&&(
        <>
          <div onClick={closeForm} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
          <div onClick={closeForm} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(560px,92vw)",zIndex:401}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(560px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{position:"sticky",top:0,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1}}>
              <div style={{fontWeight:700,fontSize:15}}>{form.uid?"Edit":"New"} Security Guard</div>
              <button onClick={closeForm} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
            </div>
            <div style={{padding:"20px 24px",flex:1}}>
              {/* Photo */}
              <div style={{marginBottom:20,padding:16,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
                <label className="form-label" style={{marginBottom:10}}>
                  Photo {uploading&&<span style={{fontSize:11,color:"var(--accent)",marginLeft:8}}>Uploading...</span>}
                </label>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <PhotoStamp photo={photoSrc||""} name={form.sname||"?"} size={64}/>
                  <div style={{flex:1}}>
                    {cameraOn?(
                      <CameraCapture onCapture={handleCapture} onCancel={()=>setCameraOn(false)}/>
                    ):(
                      <button className="btn btn-ghost btn-sm" onClick={()=>setCameraOn(true)} disabled={uploading}>
                        <Camera size={13}/>{photoSrc?"Retake Photo":"Capture Photo"}
                      </button>
                    )}
                    {photoSrc&&!cameraOn&&(
                      <div style={{fontSize:11,color:"var(--green)",marginTop:6}}>
                        ✓ {form.photoUrl?.startsWith("http")?"Saved to Cloudinary":"Photo captured"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Security Code</label>
                  <input name="scode" className="form-input" value={form.scode} onChange={onChange} placeholder="S001"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender <span className="req">*</span></label>
                  <select name="gender" className={`form-input ${errors.gender?"err":""}`} value={form.gender} onChange={onChange}>
                    <option value="">— Select —</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  {errors.gender&&<div className="form-error">{errors.gender}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name <span className="req">*</span></label>
                <input name="sname" className={`form-input ${errors.sname?"err":""}`} value={form.sname} onChange={onChange} placeholder="Security guard full name"/>
                {errors.sname&&<div className="form-error">{errors.sname}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile 1</label>
                  <input name="smobile1" className="form-input" value={form.smobile1} onChange={onChange} inputMode="numeric"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile 2</label>
                  <input name="smobile2" className="form-input" value={form.smobile2} onChange={onChange} inputMode="numeric"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input name="spassword" className="form-input" value={form.spassword} onChange={onChange} placeholder="Login password"/>
              </div>
              <div style={{marginBottom:8,fontWeight:600,fontSize:12,color:"var(--text2)"}}>Address</div>
              {["address1","address2","address3","address4","address5"].map((f,i)=>(
                <div className="form-group" key={f} style={{marginBottom:8}}>
                  <input name={f} className="form-input" value={form[f]||""} onChange={onChange} placeholder={`Address line ${i+1}`}/>
                </div>
              ))}
              <div className="form-group">
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={form.active!==false}
                    onChange={e=>setForm(p=>({...p,active:e.target.checked}))}
                    style={{accentColor:"var(--accent)"}}/>
                  <span className="form-label" style={{margin:0}}>Active</span>
                </label>
              </div>
            </div>
            <div style={{position:"sticky",bottom:0,background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"14px 24px",display:"flex",gap:8}}>
              <button className="btn btn-primary" onClick={onSave} disabled={saving||uploading} style={{flex:1}}>
                {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={15}/>Save</>}
              </button>
              <button className="btn btn-ghost" onClick={closeForm}><X size={14}/> Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* View drawer */}
      {viewRow&&(
        <>
          <div onClick={()=>setViewRow(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
          <div onClick={()=>setViewRow(null)} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(480px,92vw)",zIndex:401}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(480px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto"}}>
            <div style={{position:"sticky",top:0,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:15}}><Eye size={16}/> Security Details</div>
              <button onClick={()=>setViewRow(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
            </div>
            <div style={{padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:14,background:"var(--surface2)",borderRadius:"var(--radius-sm)"}}>
                <PhotoStamp photo={viewRow.photo} name={viewRow.sname} size={64}/>
                <div>
                  <div style={{fontWeight:700,fontSize:16}}>{viewRow.sname||"—"}</div>
                  <div style={{fontSize:12,color:"var(--text2)"}}>{viewRow.scode||"—"} · {viewRow.gender||"—"}</div>
                  <div style={{marginTop:6}}>{viewRow.active?<span className="badge badge-in">Active</span>:<span className="badge badge-out">Inactive</span>}</div>
                </div>
              </div>
              {[["Mobile 1",viewRow.smobile1||"—"],["Mobile 2",viewRow.smobile2||"—"],["Address 1",viewRow.address1||"—"],["Address 2",viewRow.address2||"—"],["Address 3",viewRow.address3||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                  <span style={{fontSize:11,color:"var(--text3)",fontWeight:600,textTransform:"uppercase"}}>{l}</span>
                  <span style={{fontSize:13}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}