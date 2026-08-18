import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useAuth } from "../../context/AuthContext";
import { getVehicleById, createVehicle, updateVehicle, markVehicleOut } from "../../services/vehicleService";
import { uploadVehiclePhoto } from "../../services/photoService";
import Toast from "../../components/Toast";
import { ArrowLeft, Camera, LogOut, Save, Car, Search, ChevronUp, X, Upload } from "lucide-react";

const ID_TYPES    = ["Aadhar","PAN","Others","Driving License"];
const VISIT_TYPES = ["Delivery","Pickup","Service","Vendor","Meeting","Contractor","Other"];
const isValidMobile = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));

const EMPTY = {
  name:"", mobile:"", visitType:"", idType:"", idNumber:"",
  company:"", toMeet:"", notes:"", vehicleNo:"", warehouse:0,
  photo:"", photoUrl:"", yearSlno:0, gateUid:0, inTime:null, outTime:null,
};

const isCloudinaryUrl = v => Boolean(v) && (String(v).startsWith("http://") || String(v).startsWith("https://"));
const isBase64        = v => Boolean(v) && String(v).length > 100 && !String(v).startsWith("http");

export default function VehicleForm() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const isEdit       = Boolean(id);
  const { isMobile } = useResponsive();
  const { user }     = useAuth();
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);

  const [form, setForm]           = useState(EMPTY);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]     = useState(isEdit);
  const [toast, setToast]         = useState(null);
  const [cameraOn, setCameraOn]   = useState(false);
  const [stream, setStream]       = useState(null);
  const [showPhoto, setShowPhoto] = useState(!isMobile);

  useEffect(() => { setShowPhoto(!isMobile); }, [isMobile]);

  useEffect(() => {
    if (isMobile && user?.gateId) setForm(p => ({ ...p, gateUid: user.gateId }));
  }, [isMobile, user?.gateId]);

  useEffect(() => {
    if (!isEdit) return;
    getVehicleById(id)
      .then(r => {
        if (r?.data) {
          const d = r.data;
          setForm({ ...EMPTY, ...d,
            photoUrl: isCloudinaryUrl(d.photo) ? d.photo : "",
            photo:    isBase64(d.photo)         ? d.photo : "",
          });
        }
      })
      .catch(() => setToast({ type:"error", msg:"Failed to load vehicle" }))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => {
    let { name, value } = e.target;
    if (name === "idNumber") {
      if (form.idType === "Aadhar")          value = value.replace(/\D/g,"").slice(0,12);
      if (form.idType === "PAN")             value = value.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,10);
      if (form.idType === "Others")          value = value.slice(0,25);
      if (form.idType === "Driving License") value = value.replace(/[^A-Za-z0-9-]/g,"").toUpperCase().slice(0,20);
    }
    if (name === "idType") { setForm(p => ({ ...p, idType:value, idNumber:"" })); return; }
    setForm(p => ({ ...p, [name]:value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]:"" }));
  };

  const openCam = async () => {
    if (isMobile) setShowPhoto(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } });
      setStream(s); setCameraOn(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 80);
    } catch { setToast({ type:"error", msg:"Camera access denied" }); }
  };

  const capture = () => {
    const v=videoRef.current, c=canvasRef.current; if (!v||!c) return;
    c.width=v.videoWidth||640; c.height=v.videoHeight||480;
    c.getContext("2d").drawImage(v,0,0);
    const b64 = c.toDataURL("image/jpeg",0.8).split(",")[1];
    setForm(p => ({ ...p, photo:b64, photoUrl:"" }));
    setErrors(p => ({ ...p, photo:"" }));
    if (stream) stream.getTracks().forEach(t=>t.stop());
    setStream(null); setCameraOn(false);
  };

  const closeCam = () => {
    if (stream) stream.getTracks().forEach(t=>t.stop());
    setStream(null); setCameraOn(false);
  };

  const validate = () => {
    const e = {};
    if (!form.vehicleNo.trim()) e.vehicleNo = "Vehicle number is required";
    if (!form.mobile.trim())    e.mobile    = "Mobile is required";
    else if (!isValidMobile(form.mobile)) e.mobile = "Enter valid 10-digit mobile";
    if (!form.photo && !form.photoUrl) e.photo = "Photo is required";
    return e;
  };

  const onSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.photo && isMobile) setShowPhoto(true);
      return;
    }
    setSaving(true);
    try {
      let finalPhotoUrl = form.photoUrl;

      // Upload new photo to Cloudinary if captured
      if (form.photo && !form.photoUrl) {
        setUploading(true);
        setToast({ type:"info", msg:"Uploading photo..." });
        try {
          finalPhotoUrl = await uploadVehiclePhoto(form.photo, id || null);
          setToast({ type:"success", msg:"Photo uploaded ✓" });
        } catch (uploadErr) {
          setToast({ type:"error", msg:"Photo upload failed" });
          setSaving(false); setUploading(false); return;
        } finally { setUploading(false); }
      }

      const body = { ...form, photo: finalPhotoUrl };
      if (isEdit) await updateVehicle(id, body);
      else        await createVehicle(body);

      setToast({ type:"success", msg: isEdit ? "Vehicle updated" : "Vehicle registered" });
      setTimeout(() => navigate("/vehicles"), 1200);
    } catch (err) {
      setToast({ type:"error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  const onOut = async () => {
    try {
      await markVehicleOut(id, { ...form, photo: form.photoUrl || form.photo });
      setToast({ type:"success", msg:"Vehicle checked out" });
      setTimeout(() => navigate("/vehicles"), 1000);
    } catch { setToast({ type:"error", msg:"Failed" }); }
  };

  const alreadyOut = Boolean(form.outTime);
  const photoSrc   = form.photoUrl
    ? form.photoUrl
    : form.photo ? `data:image/jpeg;base64,${form.photo}` : null;

  const PhotoSection = () => (
    <div>
      {cameraOn ? (
        <div>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width:"100%", borderRadius:"var(--radius-sm)", background:"#000", display:"block" }}/>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={capture}><Camera size={15}/> Capture</button>
            <button className="btn btn-ghost" onClick={closeCam}><X size={14}/> Cancel</button>
          </div>
        </div>
      ) : photoSrc ? (
        <div>
          <img src={photoSrc} alt="Vehicle"
            style={{ width:"100%", borderRadius:"var(--radius-sm)", objectFit:"cover", maxHeight:280, display:"block", border:"2px solid var(--accent)" }}
            onError={e => { e.target.style.display="none"; }}/>
          <button className="btn btn-ghost btn-sm" style={{ width:"100%", marginTop:8 }} onClick={openCam}>
            <Camera size={13}/> Retake Photo
          </button>
        </div>
      ) : (
        <div onClick={openCam} style={{
          width:"100%", aspectRatio:"4/3",
          background:"var(--surface2)",
          border:`2px dashed ${errors.photo?"var(--red)":"var(--border2)"}`,
          borderRadius:"var(--radius)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10,
          cursor:"pointer",
        }}>
          <Camera size={32} style={{ color:errors.photo?"var(--red)":"var(--text3)" }}/>
          <span style={{ fontSize:13, color:errors.photo?"var(--red)":"var(--text3)" }}>
            {errors.photo ? "Photo required — Tap to capture" : "Tap to open camera"}
          </span>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="spinner-page"><div className="spinner"/></div>;

  return (
    <div>
      {uploading && (
        <div style={{ position:"fixed", inset:0, zIndex:490, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)" }}>
          <div style={{ background:"var(--surface)", borderRadius:"var(--radius)", padding:28, textAlign:"center", border:"1px solid var(--border)" }}>
            <div className="spinner" style={{ margin:"0 auto 14px" }}/>
            <div style={{ fontWeight:600, fontSize:14 }}>Uploading photo to Cloudinary...</div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)}/>
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>{isEdit?"Edit Vehicle":"New Vehicle"}</h1></div>
        <button className="btn btn-ghost" onClick={() => navigate("/vehicles")}><ArrowLeft size={15}/> Back</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 200px", gap:16, alignItems:"start" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Car size={16}/>{isEdit?"Edit":"New"} Vehicle</span>
          </div>

          {/* Vehicle No + Mobile */}
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
                value={form.mobile} onChange={onChange} inputMode="numeric" maxLength={10}/>
              {errors.mobile && <div className="form-error">{errors.mobile}</div>}
            </div>
          </div>

          {/* ID Type + Number */}
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
              <input name="idNumber" className="form-input" value={form.idNumber} onChange={onChange}
                disabled={!form.idType}
                placeholder={!form.idType?"Select ID type first":form.idType==="Aadhar"?"12 digits":form.idType==="PAN"?"ABCDE1234F":form.idType==="Driving License"?"e.g. TN0120110012345":"ID number"}/>
            </div>
          </div>

          {/* Driver + Type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Driver Name</label>
              <input name="name" className="form-input" value={form.name} onChange={onChange} placeholder="Driver name"/>
            </div>
            <div className="form-group">
              <label className="form-label">Visit Type</label>
              <select name="visitType" className="form-input" value={form.visitType} onChange={onChange}>
                <option value="">— Select —</option>
                {VISIT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
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

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input name="notes" className="form-input" value={form.notes} onChange={onChange} placeholder="Optional notes"/>
          </div>

          {/* Mobile photo */}
          {isMobile && (
            <div style={{ marginTop:8 }}>
              {!showPhoto ? (
                <button className="btn btn-ghost"
                  style={{ width:"100%", justifyContent:"center",
                    borderColor:errors.photo?"var(--red)":"",
                    color:errors.photo?"var(--red)":"" }}
                  onClick={() => { setShowPhoto(true); if (!cameraOn && !photoSrc) openCam(); }}>
                  <Camera size={15}/>
                  {photoSrc?"View / Retake Photo":`Add Photo${errors.photo?" (Required)":""}`}
                </button>
              ) : (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <label className="form-label" style={{ margin:0 }}>Photo <span className="req">*</span></label>
                    {!cameraOn && <button className="modal-close" onClick={()=>setShowPhoto(false)}><ChevronUp size={16}/></button>}
                  </div>
                  <PhotoSection/>
                </div>
              )}
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="card">
            <div className="card-header"><span className="card-title"><Camera size={15}/> Photo <span className="req">*</span></span></div>
            <PhotoSection/>
          </div>
        )}
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:16 }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving||uploading}>
          {saving
            ? uploading ? <><Upload size={15}/> Uploading...</> : <><span className="spin-sm"/> Saving...</>
            : <><Save size={15}/>{isEdit?"Save Changes":"Register Vehicle"}</>}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate("/vehicles")}><ArrowLeft size={14}/> Back</button>
        {isEdit && !alreadyOut && (
          <button className="btn btn-danger" onClick={onOut}><LogOut size={14}/> Save Out Time</button>
        )}
      </div>
    </div>
  );
}