import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { getVehicleById, createVehicle, updateVehicle, markVehicleOut } from "../../services/vehicleService";
import Toast from "../../components/Toast";
import { ArrowLeft, Camera, LogOut, Save, Car, ChevronDown, ChevronUp } from "lucide-react";

const ID_TYPES    = ["Aadhar", "PAN", "VoterId"];
const VISIT_TYPES = ["Delivery","Pickup","Service","Vendor","Meeting","Other"];
const EMPTY = {
  name:"", mobile:"", visitType:"", idType:"", idNumber:"",
  company:"", toMeet:"", notes:"", vehicleNo:"", warehouse:0,
  photo:"", yearSlno:0, gateUid:0, inTime:null, outTime:null,
};

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
  const [showPhoto, setShowPhoto] = useState(!isMobile);

  useEffect(() => { setShowPhoto(!isMobile); }, [isMobile]);

  useEffect(() => {
    if (!isEdit) return;
    getVehicleById(id).then(r => {
      if (r?.data) setForm({ ...EMPTY, ...r.data });
    }).catch(() => setToast({ type:"error", msg:"Failed to load vehicle" }))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]:"" }));
  };

  const openCam = async () => {
    if (isMobile) setShowPhoto(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } });
      setStream(s); setCameraOn(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { setToast({ type:"error", msg:"Camera access denied" }); }
  };
  const capture = () => {
    const v=videoRef.current, c=canvasRef.current; if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setForm(p => ({ ...p, photo: c.toDataURL("image/jpeg",.75).split(",")[1] }));
    closeCam();
  };
  const closeCam = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null); setCameraOn(false);
  };

  const validate = () => {
    const e = {};
    if (!form.vehicleNo.trim()) e.vehicleNo = "Vehicle number required";
    if (!form.mobile.trim())    e.mobile    = "Mobile required";
    return e;
  };

  const onSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (isEdit) await updateVehicle(id, form);
      else        await createVehicle(form);
      setToast({ type:"success", msg: isEdit ? "Vehicle updated" : "Vehicle registered" });
      setTimeout(() => navigate("/vehicles"), 1200);
    } catch (err) {
      setToast({ type:"error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  const onOut = async () => {
    try {
      await markVehicleOut(id, form);
      setToast({ type:"success", msg:"Vehicle checked out" });
      setTimeout(() => navigate("/vehicles"), 1000);
    } catch { setToast({ type:"error", msg:"Failed to check out" }); }
  };

  const alreadyOut = Boolean(form.outTime);

  const PhotoPanel = () => (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><Camera size={15}/>Photo</span>
        {isMobile && <button className="modal-close" onClick={() => setShowPhoto(false)}><ChevronUp size={16}/></button>}
      </div>
      {cameraOn ? (
        <div>
          <video ref={videoRef} autoPlay playsInline style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/>Capture</button>
            <button className="btn btn-ghost btn-sm" onClick={closeCam}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="photo-box" onClick={openCam} style={{aspectRatio:"3/4"}}>
          {form.photo
            ? <img src={`data:image/jpeg;base64,${form.photo}`} alt="Vehicle"
                style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <><Camera size={28} style={{color:"var(--text3)"}}/><span className="photo-box-text">Tap to capture</span></>}
        </div>
      )}
      {form.photo && !cameraOn && (
        <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:10}} onClick={openCam}>
          <Camera size={13}/>Retake
        </button>
      )}
    </div>
  );

  if (loading) return <div className="spinner-page"><div className="spinner"/></div>;

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>{isEdit ? "Edit Vehicle" : "New Vehicle"}</h1></div>
        <button className="btn btn-ghost" onClick={() => navigate("/vehicles")}><ArrowLeft size={15}/>Back</button>
      </div>

      <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 220px", gap:16, alignItems:"start"}}>
        <div>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><span className="card-title"><Car size={16}/>Vehicle Details</span></div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vehicle No <span className="req">*</span></label>
                <input name="vehicleNo" className={`form-input ${errors.vehicleNo?"err":""}`}
                  value={form.vehicleNo} onChange={onChange} placeholder="TN01AB1234"/>
                {errors.vehicleNo && <div className="form-error">{errors.vehicleNo}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Mobile <span className="req">*</span></label>
                <input name="mobile" className={`form-input ${errors.mobile?"err":""}`}
                  value={form.mobile} onChange={onChange} placeholder="Driver mobile"
                  inputMode="numeric"/>
                {errors.mobile && <div className="form-error">{errors.mobile}</div>}
              </div>
            </div>

            {/* ID Card */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ID Type</label>
                <select name="idType" className="form-input" value={form.idType} onChange={onChange}>
                  <option value="">— Select ID —</option>
                  {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID Number</label>
                <input name="idNumber" className="form-input"
                  value={form.idNumber} onChange={onChange} placeholder="ID card number"/>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input name="name" className="form-input" value={form.name}
                  onChange={onChange} placeholder="Driver name"/>
              </div>
              <div className="form-group">
                <label className="form-label">Visit Type</label>
                <select name="visitType" className="form-input" value={form.visitType} onChange={onChange}>
                  <option value="">— Select —</option>
                  {VISIT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

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

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input name="notes" className="form-input" value={form.notes}
                onChange={onChange} placeholder="Optional notes"/>
            </div>

            {isMobile && !showPhoto && (
              <button className="btn btn-ghost" style={{width:"100%",marginBottom:8,justifyContent:"center"}}
                onClick={() => setShowPhoto(true)}>
                <Camera size={15}/>{form.photo ? "View / Retake Photo" : "Add Photo"}<ChevronDown size={14}/>
              </button>
            )}
            {isMobile && showPhoto && <div style={{marginTop:10}}><PhotoPanel/></div>}
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? <><span className="spin-sm"/>Saving...</> : <><Save size={15}/>{isEdit ? "Save Changes" : "Register Vehicle"}</>}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/vehicles")}><ArrowLeft size={14}/>Back</button>
            {isEdit && !alreadyOut && (
              <button className="btn btn-danger" onClick={onOut}><LogOut size={14}/>Vehicle Out</button>
            )}
          </div>
        </div>

        {!isMobile && <PhotoPanel/>}
      </div>
    </div>
  );
}