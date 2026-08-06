import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useAuth } from "../../context/AuthContext";
import { getVisitorById, getVisitorByMobile, createVisitor, updateVisitor, markVisitorOut } from "../../services/visitorService";
import Toast from "../../components/Toast";
import { ArrowLeft, Camera, LogOut, Save, UserCheck, ChevronDown, ChevronUp, Search } from "lucide-react";

// #5: VoterId → Others
const ID_TYPES    = ["Aadhar","PAN","Others"];
const VISIT_TYPES = ["Meeting","Guest","Vendor","Contractor","Delivery","Interview","Other"];

const isValidMobile = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));

// #4,5: ID validation
function validateIdProof(t, n) {
  if (!t || !n) return null;
  if (t === "Aadhar" && !/^\d{12}$/.test(n))          return "Aadhar must be exactly 12 digits";
  if (t === "PAN"    && !/^[A-Z0-9]{10}$/i.test(n))   return "PAN must be exactly 10 alphanumeric characters";
  if (t === "Others" && n.length > 25)                 return "ID number must be max 25 characters";
  return null;
}

const EMPTY = {
  name:"", mobile:"", visitorType:"", idType:"", idNumber:"",
  company:"", toMeet:"", notes:"", vehicleNo:"",
  visitorCount:1, photo:"", yearSlno:0, gateUid:0, inTime:null, outTime:null,
};

function CameraPreview({ videoRef, onCapture, onCancel }) {
  return (
    <div>
      <video ref={videoRef} autoPlay playsInline style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={onCapture}><Camera size={13}/>Capture</button>
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
  const [idAlert, setIdAlert]   = useState(""); // #7: modal
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(isEdit);
  const [toast, setToast]       = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream]     = useState(null);
  const [showPhoto, setShowPhoto] = useState(!isMobile);
  const [searching, setSearching] = useState(false);
  const [gates, setGates]       = useState([]);

  useEffect(() => { setShowPhoto(!isMobile); }, [isMobile]);

  // Load gates for desktop only (#6: hide on mobile)
  useEffect(() => {
    if (isMobile) return;
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/auth/gates?companyCode=514670`, {
      headers: { userid:"1", companyid:"1", gateid:"0", devicetype:"web" }
    }).then(r=>r.json()).then(r=>{ if(r.data) setGates(r.data); }).catch(()=>{});
  }, [isMobile]);

  // Pre-select gate from login on mobile
  useEffect(() => {
    if (isMobile && user?.gateId) {
      setForm(p => ({...p, gateUid: user.gateId}));
    }
  }, [isMobile, user?.gateId]);

  useEffect(() => {
    if (!isEdit) return;
    getVisitorById(id)
      .then(r => { if(r?.data) setForm({...EMPTY,...r.data}); })
      .catch(() => setToast({type:"error",msg:"Failed to load visitor"}))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => {
    let {name, value} = e.target;
    // #4: Auto-constrain ID number input
    if (name === "idNumber") {
      if (form.idType === "Aadhar") value = value.replace(/\D/g,"").slice(0,12);
      if (form.idType === "PAN")    value = value.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,10);
      if (form.idType === "Others") value = value.slice(0,25);
    }
    if (name === "idType") {
      setForm(p => ({...p, idType:value, idNumber:""})); return;
    }
    setForm(p=>({...p,[name]:value}));
    if(errors[name]) setErrors(p=>({...p,[name]:""}));
  };

  const handleMobileSearch = async () => {
    if(!form.mobile.trim()){setToast({type:"error",msg:"Enter mobile number first"});return;}
    if(!isValidMobile(form.mobile)){setToast({type:"error",msg:"Enter valid 10-digit mobile"});return;}
    setSearching(true);
    try {
      const r = await getVisitorByMobile(form.mobile.trim());
      if(r?.success&&r?.data){
        const d=r.data;
        setForm(p=>({...p,
          name:d.name||p.name, visitorType:d.visitorType||p.visitorType,
          company:d.company||p.company, toMeet:d.toMeet||p.toMeet,
          idType:d.idType||p.idType, idNumber:d.idNumber||p.idNumber,
          vehicleNo:d.vehicleNo||p.vehicleNo, notes:d.notes||p.notes,
        }));
        setToast({type:"success",msg:"Visitor details auto-filled"});
      } else {
        setToast({type:"info",msg:"No previous record found for this mobile"});
      }
    } catch {
      setToast({type:"info",msg:"No previous record found for this mobile"});
    } finally{setSearching(false);}
  };

  const openCam = async () => {
    if(isMobile) setShowPhoto(true);
    try {
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      setStream(s);setCameraOn(true);
      setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100);
    } catch{setToast({type:"error",msg:"Camera access denied"});}
  };
  const capture = () => {
    const v=videoRef.current,c=canvasRef.current;if(!v||!c)return;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setForm(p=>({...p,photo:c.toDataURL("image/jpeg",.75).split(",")[1]}));
    closeCam();
  };
  const closeCam = () => {
    if(stream)stream.getTracks().forEach(t=>t.stop());
    setStream(null);setCameraOn(false);
  };

  const validate = () => {
    const e={};
    if(!form.name.trim())   e.name="Name is required";
    if(!form.mobile.trim()) e.mobile="Mobile is required";
    else if(!isValidMobile(form.mobile)) e.mobile="Enter valid 10-digit mobile";

    // #7: ID validation via modal
    const idErr=validateIdProof(form.idType,form.idNumber);
    if(idErr){ setIdAlert(idErr); return null; }

    // #9: Photo mandatory
    if(!form.photo){ e.photo="Photo is required"; }

    return e;
  };

  const onSave = async () => {
    const errs=validate();
    if(errs===null) return; // modal shown for ID error
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
    try{await markVisitorOut(id,form);setToast({type:"success",msg:"Out time saved"});setTimeout(()=>navigate("/visitors"),1000);}
    catch{setToast({type:"error",msg:"Failed"});}
  };

  const alreadyOut=Boolean(form.outTime);

  const photoContent = cameraOn ? (
    <CameraPreview videoRef={videoRef} onCapture={capture} onCancel={closeCam}/>
  ) : (
    <div>
      <div className="photo-box" onClick={openCam}
        style={{aspectRatio:isMobile?"4/3":"3/4",border:errors.photo?"2px solid var(--error)":"undefined"}}>
        {form.photo
          ?<img src={`data:image/jpeg;base64,${form.photo}`} alt="Visitor" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          :<><Camera size={28} style={{color:errors.photo?"var(--error)":"var(--text3)"}}/><span className="photo-box-text" style={{color:errors.photo?"var(--error)":""}}>{errors.photo?"Photo required — Tap to capture":"Tap to capture"}</span></>}
      </div>
      {form.photo&&<button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:8}} onClick={openCam}><Camera size={13}/>Retake</button>}
    </div>
  );

  if(loading) return <div className="spinner-page"><div className="spinner"/></div>;

  return (
    <div>
      {/* #7: ID validation modal */}
      {idAlert && (
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)"}}>
          <div style={{background:"var(--surface)",borderRadius:"var(--radius-sm)",padding:24,maxWidth:300,width:"90%",border:"1px solid var(--border)"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>ID Validation Error</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:20,lineHeight:1.5}}>{idAlert}</div>
            <button className="btn btn-primary" style={{width:"100%"}}
              onClick={()=>{ setIdAlert(""); setTimeout(()=>document.querySelector('[name="idNumber"]')?.focus(),100); }}>
              OK — Fix ID Number
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>{isEdit?"Edit Visitor":"New Visitor"}</h1></div>
        <button className="btn btn-ghost" onClick={()=>navigate("/visitors")}><ArrowLeft size={15}/>Back</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 200px",gap:16,alignItems:"start"}}>
        <div className="card">
          <div className="card-header" style={{flexWrap:"wrap",gap:8}}>
            <span className="card-title"><UserCheck size={16}/>{isEdit?"Edit":"New"} Visitor</span>
            {/* #6: Gate dropdown desktop only */}
            {!isMobile && gates.length > 0 && (
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

          {/* Mobile + Name */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mobile <span className="req">*</span></label>
              <div className="input-group">
                <input name="mobile" className={`form-input ${errors.mobile?"err":""}`}
                  value={form.mobile} onChange={onChange} placeholder="10-digit mobile"
                  inputMode="numeric" maxLength={10}/>
                <button className="btn btn-ghost" onClick={handleMobileSearch} disabled={searching} style={{whiteSpace:"nowrap"}}>
                  {searching?<span className="spin-sm"/>:<Search size={14}/>}{" "}Search
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

          {/* ID Type + Number — #4,5 */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <select name="idType" className="form-input" value={form.idType} onChange={onChange}>
                <option value="">— Select ID —</option>
                {ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                ID Number
                {form.idType && (
                  <span style={{fontSize:10,color:"var(--text3)",marginLeft:6}}>
                    {form.idType==="Aadhar"?"(12 digits)":form.idType==="PAN"?"(10 chars)":"(max 25)"}
                  </span>
                )}
              </label>
              <input name="idNumber"
                className="form-input"
                value={form.idNumber} onChange={onChange}
                inputMode={form.idType==="Aadhar"?"numeric":"text"}
                placeholder={form.idType==="Aadhar"?"12 digits":form.idType==="PAN"?"ABCDE1234F":form.idType==="Others"?"ID number":"Select ID type first"}
                disabled={!form.idType}/>
            </div>
          </div>

          {/* Type + Count */}
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

          {/* Company + To Meet */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company</label>
              <input name="company" className="form-input" value={form.company} onChange={onChange} placeholder="Company name"/>
            </div>
            <div className="form-group">
              <label className="form-label">To Meet</label>
              <input name="toMeet" className="form-input" value={form.toMeet} onChange={onChange} placeholder="Person to meet"/>
            </div>
          </div>

          {/* Vehicle + Notes */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vehicle No</label>
              <input name="vehicleNo" className="form-input" value={form.vehicleNo} onChange={onChange} placeholder="TN01AB1234"/>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input name="notes" className="form-input" value={form.notes} onChange={onChange} placeholder="Optional notes"/>
            </div>
          </div>

          {/* Mobile: photo toggle — #9 required */}
          {isMobile && !showPhoto && (
            <button className="btn btn-ghost"
              style={{width:"100%",marginBottom:8,justifyContent:"center",
                borderColor:errors.photo?"var(--error)":"",
                color:errors.photo?"var(--error)":""}}
              onClick={()=>setShowPhoto(true)}>
              <Camera size={15}/>
              {form.photo?"View / Retake Photo":`Add Photo${errors.photo?" (Required)":""}`}
              <ChevronDown size={14}/>
            </button>
          )}
          {isMobile&&showPhoto&&(
            <div style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label className="form-label" style={{margin:0}}>Photo <span className="req">*</span></label>
                <button className="modal-close" onClick={()=>setShowPhoto(false)}><ChevronUp size={16}/></button>
              </div>
              {photoContent}
            </div>
          )}
        </div>

        {/* Desktop photo panel — #9 required */}
        {!isMobile && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Camera size={15}/>Photo <span className="req">*</span></span>
            </div>
            {photoContent}
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:16}}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={15}/>{isEdit?"Save Changes":"Register Visitor"}</>}
        </button>
        <button className="btn btn-ghost" onClick={()=>navigate("/visitors")}><ArrowLeft size={14}/>Back</button>
        {isEdit&&!alreadyOut&&<button className="btn btn-danger" onClick={onOut}><LogOut size={14}/>Save Out Time</button>}
      </div>
    </div>
  );
}