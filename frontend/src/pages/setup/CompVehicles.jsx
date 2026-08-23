import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { Plus, Search, Pencil, RefreshCw, Truck, X, Save, Trash2, Camera, Upload } from "lucide-react";
import { uploadVehiclePhoto } from "../../services/photoService";

const EMPTY = { vehicleNo:"", brand:"", driverName:"" };

function PhotoInput({ onUrl, currentUrl }) {
  const [mode,setMode]           = useState("idle");
  const [uploading,setUploading] = useState(false);
  const videoRef  = useRef(null);
  const [stream,setStream]       = useState(null);
  const fileRef   = useRef(null);

  const openCamera = async () => {
    try { const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); setStream(s); setMode("camera"); setTimeout(()=>{ if(videoRef.current)videoRef.current.srcObject=s; },80); }
    catch { alert("Camera access denied"); }
  };
  const capture = async () => {
    const v=videoRef.current,c=document.createElement("canvas"); if(!v)return;
    c.width=v.videoWidth||640; c.height=v.videoHeight||480; c.getContext("2d").drawImage(v,0,0);
    const b64=c.toDataURL("image/jpeg",0.8).split(",")[1];
    stream?.getTracks().forEach(t=>t.stop()); setStream(null); await upload(b64);
  };
  const onFile = async e => { const file=e.target.files?.[0]; if(!file)return; const r=new FileReader(); r.onload=async ev=>{await upload(ev.target.result.split(",")[1]);}; r.readAsDataURL(file); };
  const upload = async b64 => {
    setUploading(true); setMode("idle");
    try { const url=await uploadVehiclePhoto(b64,"comp-vehicle"); onUrl(url); setMode("preview"); }
    catch { alert("Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div style={{marginBottom:16}}>
      <label className="form-label">Photo</label>
      {mode==="camera"&&(
        <div>
          <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/> Capture</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{stream?.getTracks().forEach(t=>t.stop());setStream(null);setMode("idle");}}>Cancel</button>
          </div>
        </div>
      )}
      {mode!=="camera"&&(
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {currentUrl&&<img src={currentUrl} alt="Vehicle" style={{width:56,height:56,borderRadius:"var(--radius-sm)",objectFit:"cover",border:"2px solid var(--accent)"}}/>}
          <button className="btn btn-ghost btn-sm" onClick={openCamera} disabled={uploading}><Camera size={13}/>{currentUrl?"Retake":"Capture"}</button>
          <label className="btn btn-ghost btn-sm" style={{cursor:"pointer",marginBottom:0}}><Upload size={13}/> Upload<input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFile}/></label>
          {uploading&&<span style={{fontSize:12,color:"var(--accent)"}}>Uploading...</span>}
          {currentUrl&&!uploading&&<span style={{fontSize:11,color:"var(--green)"}}>✓ Saved</span>}
        </div>
      )}
    </div>
  );
}

function VehicleModal({ mode, initial, onSave, onClose, saving }) {
  const [form,setForm]     = useState(initial||EMPTY);
  const [errors,setErrors] = useState({});
  const [photoUrl,setPhotoUrl] = useState(initial?.photoUrl||"");
  const onChange = e => { setForm(p=>({...p,[e.target.name]:e.target.value})); if(errors[e.target.name])setErrors(p=>({...p,[e.target.name]:""})); };
  const handleSave = () => {
    const e={};
    if(!form.vehicleNo?.trim()) e.vehicleNo="Vehicle No is required";
    if(!form.brand?.trim())     e.brand="Brand is required";
    if(Object.keys(e).length){setErrors(e);return;}
    onSave({...form,photoUrl});
  };
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:401,width:"min(440px,92vw)",background:"var(--surface)",borderRadius:"var(--radius)",border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:15}}><Truck size={15} style={{color:"var(--accent)",marginRight:6}}/>{mode==="add"?"Add":"Edit"} Company Vehicle</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
        </div>
        <div style={{padding:"20px",maxHeight:"70vh",overflowY:"auto"}}>
          <PhotoInput onUrl={setPhotoUrl} currentUrl={photoUrl}/>
          <div className="form-group">
            <label className="form-label">Vehicle No <span className="req">*</span></label>
            <input name="vehicleNo" className={`form-input ${errors.vehicleNo?"err":""}`} value={form.vehicleNo} onChange={onChange} placeholder="TN37DS1738" autoFocus/>
            {errors.vehicleNo&&<div className="form-error">{errors.vehicleNo}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Brand <span className="req">*</span></label>
            <input name="brand" className={`form-input ${errors.brand?"err":""}`} value={form.brand} onChange={onChange} placeholder="Wagon R"/>
            {errors.brand&&<div className="form-error">{errors.brand}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Driver Name</label>
            <input name="driverName" className="form-input" value={form.driverName} onChange={onChange} placeholder="Driver full name"/>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/>Save</>}</button>
        </div>
      </div>
    </>
  );
}

export default function CompVehicles() {
  const [rows,setRows]       = useState([]);
  const [q,setQ]             = useState("");
  const [tab,setTab]         = useState("Active");
  const [loading,setLoading] = useState(true);
  const [toast,setToast]     = useState(null);
  const [modal,setModal]     = useState(null);
  const [saving,setSaving]   = useState(false);

  const load = useCallback(async ()=>{
    setLoading(true);
    try{ const r=await api.get("/comp-vehicles"); setRows(r.data?.data||[]); }
    catch{ setToast({type:"error",msg:"Failed to load"}); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{load();},[load]);

  const filtered = rows
    .filter(r => tab==="Active" ? r.active : !r.active)
    .filter(r=>{ if(!q)return true; const s=q.toLowerCase(); return (r.vehicleNo||"").toLowerCase().includes(s)||(r.brand||"").toLowerCase().includes(s)||(r.driverName||"").toLowerCase().includes(s); });

  const handleSave = async form => {
    setSaving(true);
    try {
      let res;
      if(modal.mode==="add") res=await api.post("/comp-vehicles",form);
      else res=await api.put(`/comp-vehicles/${modal.data.uid}`,form);
      if(res.data?.success===false){ setToast({type:"error",msg:res.data.message||"Failed"}); return; }
      setToast({type:"success",msg:modal.mode==="add"?"Vehicle added":"Vehicle updated"});
      setModal(null); load();
    }catch(err){setToast({type:"error",msg:err.response?.data?.message||"Failed"});}
    finally{setSaving(false);}
  };

  const handleDelete = async row => {
    if(!confirm(`Delete "${row.vehicleNo}"?`))return;
    try{ await api.delete(`/comp-vehicles/${row.uid}`); setToast({type:"success",msg:"Deleted"}); load(); }
    catch(err){setToast({type:"error",msg:err.response?.data?.message||"Failed"});}
  };

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      {modal&&<VehicleModal mode={modal.mode} initial={modal.data} onSave={handleSave} onClose={()=>setModal(null)} saving={saving}/>}

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>Company Vehicles</h1><p>{rows.length} vehicle{rows.length!==1?"s":""}</p></div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={()=>setModal({mode:"add",data:{...EMPTY}})}><Plus size={15}/> Add Vehicle</button>
        </div>
      </div>

      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:0,border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",overflow:"hidden"}}>
          {["Active","Inactive"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 16px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===t?"var(--accent)":"none",color:tab===t?"#000":"var(--text2)",transition:"all .15s"}}>{t}</button>
          ))}
        </div>
        <div style={{position:"relative",maxWidth:320}}>
          <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}/>
          <input className="form-input" placeholder="Search vehicle, brand or driver..." value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:32}}/>
          {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}><X size={14}/></button>}
        </div>
      </div>

      {loading?<div className="spinner-page"><div className="spinner"/></div>:filtered.length===0?(
        <div className="empty-state"><div className="empty-icon"><Truck size={22}/></div><h3>{q?"No results":"No company vehicles"}</h3></div>
      ):(
        <div className="table-wrap"><table>
          <thead><tr><th style={{width:60}}>Sl.No</th><th>Vehicle No</th><th>Brand</th><th>Driver Name</th><th>Status</th><th style={{width:120}}>Actions</th></tr></thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={row.uid??i} onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td className="td-muted" style={{textAlign:"center"}}>{row.serialNo||i+1}</td>
                <td style={{fontWeight:700}}>{row.vehicleNo||"—"}</td>
                <td>{row.brand||"—"}</td>
                <td>{row.driverName||"—"}</td>
                <td>{row.active?<span className="badge badge-in">Active</span>:<span className="badge badge-out">Inactive</span>}</td>
                <td><div style={{display:"flex",gap:4}}>
                  <button className="btn btn-ghost btn-xs" onClick={()=>setModal({mode:"edit",data:{...row}})}><Pencil size={11}/> Edit</button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={()=>handleDelete(row)}><Trash2 size={11}/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}