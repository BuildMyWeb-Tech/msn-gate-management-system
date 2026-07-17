import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { getVehicleById, createVehicle, updateVehicle, markVehicleOut } from "../../services/vehicleService";
import { getDropdown } from "../../services/setupService";
import Toast from "../../components/Toast";
import { ArrowLeft, Camera, Search, LogOut, Save, Car, Warehouse, ChevronDown, ChevronUp } from "lucide-react";

const EMPTY = { vehicleNo:"", mobile:"", visitType:"", name:"", company:"", warehouse:"", remarks:"", passNo:"", photo:"", active:1 };

export default function VehicleForm() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const isEdit       = Boolean(id);
  const { isMobile } = useResponsive();
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);

  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(isEdit);
  const [toast, setToast]       = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream]     = useState(null);
  const [whList, setWHList]     = useState([]);
  const [whSearch, setWHS]      = useState("");
  const [existing, setExisting] = useState(null);
  const [showPhoto, setShowPhoto] = useState(!isMobile);

  useEffect(() => { setShowPhoto(!isMobile); }, [isMobile]);

  useEffect(() => { getDropdown("locations").then(r=>{ if(r?.data) setWHList(r.data); }).catch(()=>{}); }, []);

  useEffect(() => {
    if(!isEdit) return;
    getVehicleById(id).then(r=>{
      if(r?.data){ const d=r.data; setForm({ vehicleNo:d.VehicleNo||d.vehicleNo||"", mobile:d.Mobile||d.mobile||"", visitType:d.VisitType||d.visitType||"", name:d.Name||d.name||"", company:d.Company||d.company||"", warehouse:d.Warehouse||d.warehouse||"", remarks:d.Remarks||d.remarks||"", passNo:d.PassNo||d.passNo||"", photo:d.Photo||d.photo||"", active:d.Active??1 }); setExisting(d); }
    }).finally(()=>setLoading(false));
  },[isEdit,id]);

  const onChange = e=>{const{name,value}=e.target;setForm(p=>({...p,[name]:value}));if(errors[name])setErrors(p=>({...p,[name]:""}));};
  const openCam = async()=>{ if(isMobile) setShowPhoto(true); try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});setStream(s);setCameraOn(true);setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100);}catch{setToast({type:"error",msg:"Camera access denied"});} };
  const capture = ()=>{ const v=videoRef.current,c=canvasRef.current;if(!v||!c)return;c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);setForm(p=>({...p,photo:c.toDataURL("image/jpeg",.75).split(",")[1]}));closeCam(); };
  const closeCam = ()=>{ if(stream)stream.getTracks().forEach(t=>t.stop());setStream(null);setCameraOn(false); };
  const validate = ()=>{ const e={};if(!form.vehicleNo.trim())e.vehicleNo="Vehicle number required";if(!form.mobile.trim())e.mobile="Mobile required";return e; };

  const onSave = async()=>{
    const errs=validate();if(Object.keys(errs).length){setErrors(errs);return;}
    setSaving(true);
    try{
      if(isEdit){await updateVehicle(id,form);setToast({type:"success",msg:"Vehicle updated"});}
      else      {await createVehicle(form);    setToast({type:"success",msg:"Vehicle registered"});}
      setTimeout(()=>navigate("/vehicles"),1200);
    }catch(err){setToast({type:"error",msg:err.response?.data?.message||"Failed to save"});}
    finally{setSaving(false);}
  };

  const onOut = async()=>{
    try{await markVehicleOut(id);setToast({type:"success",msg:"Vehicle checked out"});setTimeout(()=>navigate("/vehicles"),1000);}
    catch{setToast({type:"error",msg:"Failed to check out"});}
  };

  const filteredWH = whList.filter(w=>(w.name||"").toLowerCase().includes(whSearch.toLowerCase()));
  const alreadyOut = existing && Boolean(existing.OutTime||existing.outTime);

  if(loading) return <div className="spinner-page"><div className="spinner"/></div>;

  const PhotoPanel = () => (
    <div className="card" style={{ marginBottom: isMobile ? 14 : 0 }}>
      <div className="card-header">
        <span className="card-title"><Camera size={16}/>Photo</span>
        {isMobile && <button className="modal-close" onClick={()=>setShowPhoto(false)}><ChevronUp size={16}/></button>}
      </div>
      {cameraOn?(
        <div>
          <video ref={videoRef} autoPlay playsInline style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/>Capture</button>
            <button className="btn btn-ghost btn-sm" onClick={closeCam}>Cancel</button>
          </div>
        </div>
      ):(
        <div className="photo-box" onClick={openCam} style={{aspectRatio:"3/4"}}>
          {form.photo?<img src={`data:image/jpeg;base64,${form.photo}`} alt="Vehicle"/>:<><Camera size={28} style={{color:"var(--text3)"}}/><span className="photo-box-text">Tap to capture</span></>}
        </div>
      )}
      {form.photo&&!cameraOn&&<button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:10}} onClick={openCam}><Camera size={13}/>Retake</button>}
    </div>
  );

  const formContent = (
    <div className="card" style={{marginBottom:16}}>
      <div className="card-header"><span className="card-title"><Car size={16}/>Vehicle Details</span></div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Vehicle No <span className="req">*</span></label>
          <input name="vehicleNo" className={`form-input ${errors.vehicleNo?"err":""}`} value={form.vehicleNo} onChange={onChange} placeholder="TN01AB1234"/>
          {errors.vehicleNo&&<div className="form-error">{errors.vehicleNo}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Mobile No <span className="req">*</span></label>
          <input name="mobile" className={`form-input ${errors.mobile?"err":""}`} value={form.mobile} onChange={onChange} placeholder="Driver mobile"/>
          {errors.mobile&&<div className="form-error">{errors.mobile}</div>}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Visit Type</label>
          <select name="visitType" className="form-input" value={form.visitType} onChange={onChange}>
            <option value="">— Select —</option>
            {["Delivery","Pickup","Service","Vendor","Other"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Driver Name</label>
          <input name="name" className="form-input" value={form.name} onChange={onChange} placeholder="Driver name"/>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Company</label>
          <input name="company" className="form-input" value={form.company} onChange={onChange} placeholder="Company name"/>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <input name="remarks" className="form-input" value={form.remarks} onChange={onChange} placeholder="Optional"/>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Warehouse</label>
        <div className="dropdown-wrap">
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Search size={14} style={{color:"var(--text3)",flexShrink:0}}/>
            <input className="form-input" placeholder="Search warehouse..." value={whSearch||form.warehouse}
              onChange={e=>{setWHS(e.target.value);setForm(p=>({...p,warehouse:e.target.value}));}}/>
          </div>
          {whSearch&&filteredWH.length>0&&(
            <div className="dropdown-list">
              {filteredWH.map(w=><div key={w.id} className="dropdown-item" onClick={()=>{setForm(p=>({...p,warehouse:w.name}));setWHS("");}}><Warehouse size={13} style={{color:"var(--text3)"}}/>{w.name}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Photo toggle */}
      {isMobile && !showPhoto && (
        <button className="btn btn-ghost" style={{width:"100%",marginBottom:8,justifyContent:"center"}} onClick={()=>setShowPhoto(true)}>
          <Camera size={15}/>{form.photo?"View / Retake Photo":"Add Photo"}<ChevronDown size={14}/>
        </button>
      )}
      {isMobile && showPhoto && <PhotoPanel />}
    </div>
  );

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>{isEdit?"Edit Vehicle":"New Vehicle"}</h1>
          {form.passNo&&<p>Pass: <span className="badge-pass" style={{marginLeft:4}}>{form.passNo}</span></p>}
        </div>
        <button className="btn btn-ghost" onClick={()=>navigate("/vehicles")}><ArrowLeft size={15}/> Back</button>
      </div>

      {isMobile ? (
        <div>{formContent}</div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:16,alignItems:"start"}}>
          <div>{formContent}</div>
          <PhotoPanel/>
        </div>
      )}

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={15}/>{isEdit?"Save Changes":"Register Vehicle"}</>}
        </button>
        <button className="btn btn-ghost" onClick={()=>navigate("/vehicles")}><ArrowLeft size={14}/>Back</button>
        {isEdit&&!alreadyOut&&<button className="btn btn-danger" onClick={onOut}><LogOut size={14}/>Vehicle Out</button>}
      </div>
    </div>
  );
}