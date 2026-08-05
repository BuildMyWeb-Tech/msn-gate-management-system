import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useAuth } from "../../context/AuthContext";
import { getVisitorById, createVisitor, updateVisitor, markVisitorOut } from "../../services/visitorService";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { ArrowLeft, Camera, LogOut, Save, UserCheck, ChevronDown, ChevronUp, Search } from "lucide-react";

const ID_TYPES    = ["Aadhar","PAN","VoterId"];
const VISIT_TYPES = ["Meeting","Guest","Vendor","Contractor","Delivery","Interview","Other"];

const isValidMobile  = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));
const isValidAadhar  = v => /^\d{12}$/.test(String(v).replace(/\s/g,""));
const isValidPAN     = v => /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(String(v));
const isValidVoterId = v => String(v).trim().length >= 8;

const EMPTY = {
  name:"", mobile:"", visitorType:"", idType:"", idNumber:"",
  company:"", toMeet:"", notes:"", vehicleNo:"",
  visitorCount:1, photo:"", yearSlno:0, gateUid:0, inTime:null, outTime:null,
};

// CameraPreview outside component — prevents remount/focus loss
function CameraPreview({ videoRef, onCapture, onCancel }) {
  return (
    <div>
      <video ref={videoRef} autoPlay playsInline
        style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={onCapture}>
          <Camera size={13}/> Capture
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function VisitorForm() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const isEdit       = Boolean(id);
  const { isMobile } = useResponsive();
  const { user }     = useAuth();
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);

  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(isEdit);
  const [toast, setToast]       = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream]     = useState(null);
  const [showPhoto, setShowPhoto] = useState(!isMobile);
  const [searching, setSearching] = useState(false);

  // Gates for dropdown
  const [gates, setGates] = useState([]);
  useEffect(() => {
    api.get("/auth/gates?companyCode=514670")
      .then(r => { if(r.data?.data) setGates(r.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => { setShowPhoto(!isMobile); }, [isMobile]);

  useEffect(() => {
    if (!isEdit) return;
    getVisitorById(id)
      .then(r => { if(r?.data) setForm({...EMPTY,...r.data}); })
      .catch(() => setToast({type:"error",msg:"Failed to load visitor"}))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => {
    const{name,value}=e.target;
    setForm(p=>({...p,[name]:value}));
    if(errors[name]) setErrors(p=>({...p,[name]:""}));
  };

  // Mobile search — search visitor by mobile in today's list
  const handleMobileSearch = async () => {
    if (!form.mobile.trim()) { setToast({type:"error",msg:"Enter mobile number first"}); return; }
    if (!isValidMobile(form.mobile)) { setToast({type:"error",msg:"Enter valid 10-digit mobile"}); return; }
    setSearching(true);
    try {
      const gateId = user?.gateId || 0;
      const today  = new Date().toISOString().split("T")[0];
      const r = await api.get(`/visitors?date=${today}&gateId=${gateId}`);
      const found = (r.data?.data||[]).find(v => String(v.mobile) === form.mobile.trim());
      if (found) {
        setForm(p => ({
          ...p,
          name:        found.name        || p.name,
          visitorType: found.visitorType || p.visitorType,
          company:     found.company     || p.company,
          toMeet:      found.toMeet      || p.toMeet,
          idType:      found.idType      || p.idType,
          idNumber:    found.idNumber    || p.idNumber,
        }));
        setToast({type:"success",msg:"Visitor details auto-filled"});
      } else {
        setToast({type:"info",msg:"No previous record found for this mobile"});
      }
    } catch { setToast({type:"error",msg:"Search failed"}); }
    finally { setSearching(false); }
  };

  const openCam = async () => {
    if(isMobile) setShowPhoto(true);
    try {
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      setStream(s); setCameraOn(true);
      setTimeout(()=>{ if(videoRef.current) videoRef.current.srcObject=s; },100);
    } catch { setToast({type:"error",msg:"Camera access denied"}); }
  };
  const capture = () => {
    const v=videoRef.current,c=canvasRef.current; if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setForm(p=>({...p,photo:c.toDataURL("image/jpeg",.75).split(",")[1]}));
    closeCam();
  };
  const closeCam = () => {
    if(stream) stream.getTracks().forEach(t=>t.stop());
    setStream(null); setCameraOn(false);
  };

  const validate = () => {
    const e={};
    if(!form.name.trim())   e.name="Name is required";
    if(!form.mobile.trim()) e.mobile="Mobile is required";
    else if(!isValidMobile(form.mobile)) e.mobile="Enter valid 10-digit mobile";
    if(form.idType&&form.idNumber){
      if(form.idType==="Aadhar"&&!isValidAadhar(form.idNumber)) e.idNumber="Aadhar: 12 digits";
      if(form.idType==="PAN"&&!isValidPAN(form.idNumber)) e.idNumber="PAN format: ABCDE1234F";
      if(form.idType==="VoterId"&&!isValidVoterId(form.idNumber)) e.idNumber="VoterId: min 8 chars";
    }
    return e;
  };

  const onSave = async () => {
    const errs=validate();
    if(Object.keys(errs).length){setErrors(errs);return;}
    setSaving(true);
    try {
      if(isEdit) await updateVisitor(id,form);
      else       await createVisitor(form);
      setToast({type:"success",msg:isEdit?"Visitor updated":"Visitor registered"});
      setTimeout(()=>navigate("/visitors"),1200);
    } catch(err){
      setToast({type:"error",msg:err.response?.data?.message||"Failed to save"});
    } finally{setSaving(false);}
  };

  const onOut = async () => {
    try {
      await markVisitorOut(id,form);
      setToast({type:"success",msg:"Visitor checked out"});
      setTimeout(()=>navigate("/visitors"),1000);
    } catch{setToast({type:"error",msg:"Failed to check out"});}
  };

  const alreadyOut = Boolean(form.outTime);

  // Photo panel — inline JSX, not sub-component (prevents cursor jump)
  const photoContent = cameraOn ? (
    <CameraPreview videoRef={videoRef} onCapture={capture} onCancel={closeCam}/>
  ) : (
    <div>
      <div className="photo-box" onClick={openCam} style={{aspectRatio:isMobile?"4/3":"3/4"}}>
        {form.photo
          ? <img src={`data:image/jpeg;base64,${form.photo}`} alt="Visitor" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <><Camera size={28} style={{color:"var(--text3)"}}/><span className="photo-box-text">Tap to capture</span></>}
      </div>
      {form.photo && (
        <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:8}} onClick={openCam}>
          <Camera size={13}/> Retake
        </button>
      )}
    </div>
  );

  if(loading) return <div className="spinner-page"><div className="spinner"/></div>;

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>{isEdit?"Edit Visitor":"New Visitor"}</h1></div>
        <button className="btn btn-ghost" onClick={()=>navigate("/visitors")}><ArrowLeft size={15}/> Back</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 200px",gap:16,alignItems:"start"}}>
        {/* Main form */}
        <div className="card">
          <div className="card-header" style={{flexWrap:"wrap",gap:8}}>
            <span className="card-title"><UserCheck size={16}/>{isEdit?"Edit":"New"} Visitor</span>
            {/* Gate dropdown — top right of card, desktop only */}
            {!isMobile && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
                <label style={{fontSize:12,color:"var(--text2)",fontWeight:600}}>Gate</label>
                <select name="gateUid" className="form-input" style={{width:150}}
                  value={form.gateUid||""} onChange={onChange}>
                  <option value="">— Select Gate —</option>
                  {gates.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Row 1: Mobile* + Search + Name* */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mobile <span className="req">*</span></label>
              <div className="input-group">
                <input name="mobile"
                  className={`form-input ${errors.mobile?"err":""}`}
                  value={form.mobile} onChange={onChange}
                  placeholder="10-digit mobile" inputMode="numeric" maxLength={10}/>
                <button className="btn btn-ghost"
                  onClick={handleMobileSearch} disabled={searching}
                  style={{whiteSpace:"nowrap"}}>
                  {searching?<span className="spin-sm"/>:<Search size={14}/>}
                  {" "}Search
                </button>
              </div>
              {errors.mobile&&<div className="form-error">{errors.mobile}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Name <span className="req">*</span></label>
              <input name="name" className={`form-input ${errors.name?"err":""}`}
                value={form.name} onChange={onChange} placeholder="Full name"/>
              {errors.name&&<div className="form-error">{errors.name}</div>}
            </div>
          </div>

          {/* Row 2: ID Type + ID Number */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <select name="idType" className="form-input" value={form.idType} onChange={onChange}>
                <option value="">— Select ID —</option>
                {ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ID Number</label>
              <input name="idNumber" className={`form-input ${errors.idNumber?"err":""}`}
                value={form.idNumber} onChange={onChange} placeholder="ID card number"/>
              {errors.idNumber&&<div className="form-error">{errors.idNumber}</div>}
            </div>
          </div>

          {/* Row 3: Visitor Type + Visitor Count */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Visitor Type</label>
              <select name="visitorType" className="form-input" value={form.visitorType} onChange={onChange}>
                <option value="">— Select Type —</option>
                {VISIT_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visitor Count</label>
              <input name="visitorCount" type="number" className="form-input"
                value={form.visitorCount} onChange={onChange} min={1}/>
            </div>
          </div>

          {/* Row 4: Company + To Meet */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company</label>
              <input name="company" className="form-input" value={form.company}
                onChange={onChange} placeholder="Company name"/>
            </div>
            <div className="form-group">
              <label className="form-label">To Meet</label>
              <input name="toMeet" className="form-input" value={form.toMeet}
                onChange={onChange} placeholder="Person to meet"/>
            </div>
          </div>

          {/* Row 5: Vehicle No + Notes */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vehicle No</label>
              <input name="vehicleNo" className="form-input" value={form.vehicleNo}
                onChange={onChange} placeholder="TN01AB1234"/>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input name="notes" className="form-input" value={form.notes}
                onChange={onChange} placeholder="Optional notes"/>
            </div>
          </div>

          {/* Mobile gate selector */}
          {isMobile && (
            <div className="form-group">
              <label className="form-label">Gate</label>
              <select name="gateUid" className="form-input" value={form.gateUid||""} onChange={onChange}>
                <option value="">— Select Gate —</option>
                {gates.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {/* Mobile: photo toggle */}
          {isMobile && !showPhoto && (
            <button className="btn btn-ghost" style={{width:"100%",marginBottom:8,justifyContent:"center"}}
              onClick={()=>setShowPhoto(true)}>
              <Camera size={15}/>{form.photo?"View / Retake Photo":"Add Photo"}<ChevronDown size={14}/>
            </button>
          )}
          {isMobile && showPhoto && (
            <div style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label className="form-label" style={{margin:0}}>Photo</label>
                <button className="modal-close" onClick={()=>setShowPhoto(false)}><ChevronUp size={16}/></button>
              </div>
              {photoContent}
            </div>
          )}
        </div>

        {/* Desktop photo panel */}
        {!isMobile && (
          <div className="card">
            <div className="card-header"><span className="card-title"><Camera size={15}/>Photo</span></div>
            {photoContent}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:16}}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={15}/>{isEdit?"Save Changes":"Register Visitor"}</>}
        </button>
        <button className="btn btn-ghost" onClick={()=>navigate("/visitors")}><ArrowLeft size={14}/> Back</button>
        {isEdit&&!alreadyOut&&(
          <button className="btn btn-danger" onClick={onOut}><LogOut size={14}/> Visitor Out</button>
        )}
      </div>
    </div>
  );
}