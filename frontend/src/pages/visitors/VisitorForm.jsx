import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useAuth } from "../../context/AuthContext";
import {
  getVisitorById, getVisitorByMobile, createVisitor, updateVisitor, markVisitorOut
} from "../../services/visitorService";
import Toast from "../../components/Toast";
import {
  ArrowLeft, Camera, LogOut, Save, UserCheck, Search, ChevronUp, X
} from "lucide-react";

const ID_TYPES    = ["Aadhar", "PAN", "Others"];
const VISIT_TYPES = ["Meeting","Guest","Vendor","Contractor","Delivery","Interview","Other"];

const isValidMobile = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));

function validateIdProof(t, n) {
  if (!t || !n) return null;
  if (t === "Aadhar" && !/^\d{12}$/.test(n))         return "Aadhar must be exactly 12 digits";
  if (t === "PAN"    && !/^[A-Z0-9]{10}$/i.test(n))  return "PAN must be exactly 10 alphanumeric characters";
  if (t === "Others" && n.length > 25)                return "ID number must be max 25 characters";
  return null;
}

const EMPTY = {
  name:"", mobile:"", visitorType:"", idType:"", idNumber:"",
  company:"", toMeet:"", notes:"", vehicleNo:"",
  visitorCount:1, photo:"", yearSlno:0, gateUid:0, inTime:null, outTime:null,
};

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
  const [idAlert, setIdAlert]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(isEdit);
  const [toast, setToast]       = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream]     = useState(null);
  const [showPhoto, setShowPhoto] = useState(!isMobile);
  const [searching, setSearching] = useState(false);
  const [gates, setGates]       = useState([]);

  useEffect(() => { setShowPhoto(!isMobile); }, [isMobile]);

  // Pre-select gate from login on mobile
  useEffect(() => {
    if (isMobile && user?.gateId) setForm(p => ({ ...p, gateUid: user.gateId }));
  }, [isMobile, user?.gateId]);

  // Load gates for desktop
  useEffect(() => {
    if (isMobile) return;
    const base = import.meta.env.VITE_API_URL || "/api";
    fetch(`${base}/auth/gates?companyCode=514670`, {
      headers: { userid:"1", companyid:"1", gateid:"0", devicetype:"web" }
    }).then(r => r.json()).then(r => { if (r.data) setGates(r.data); }).catch(() => {});
  }, [isMobile]);

  useEffect(() => {
    if (!isEdit) return;
    getVisitorById(id)
      .then(r => { if (r?.data) setForm({ ...EMPTY, ...r.data }); })
      .catch(() => setToast({ type:"error", msg:"Failed to load visitor" }))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => {
    let { name, value } = e.target;
    if (name === "idNumber") {
      if (form.idType === "Aadhar") value = value.replace(/\D/g,"").slice(0,12);
      if (form.idType === "PAN")    value = value.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,10);
      if (form.idType === "Others") value = value.slice(0,25);
    }
    if (name === "idType") { setForm(p => ({ ...p, idType:value, idNumber:"" })); return; }
    setForm(p => ({ ...p, [name]:value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]:"" }));
  };

  const handleMobileSearch = async () => {
    if (!form.mobile.trim()) { setToast({ type:"error", msg:"Enter mobile number first" }); return; }
    if (!isValidMobile(form.mobile)) { setToast({ type:"error", msg:"Enter valid 10-digit mobile" }); return; }
    setSearching(true);
    try {
      const r = await getVisitorByMobile(form.mobile.trim());
      if (r?.success && r?.data) {
        const d = r.data;
        setForm(p => ({
          ...p,
          name:        d.name        || p.name,
          visitorType: d.visitorType || p.visitorType,
          company:     d.company     || p.company,
          toMeet:      d.toMeet      || p.toMeet,
          idType:      d.idType      || p.idType,
          idNumber:    d.idNumber    || p.idNumber,
          vehicleNo:   d.vehicleNo   || p.vehicleNo,
        }));
        setToast({ type:"success", msg:"Visitor details auto-filled" });
      } else {
        setToast({ type:"info", msg:"No previous record found for this mobile" });
      }
    } catch {
      setToast({ type:"info", msg:"No previous record found for this mobile" });
    } finally { setSearching(false); }
  };

  // Camera: open immediately, start stream
  const openCam = async () => {
    if (isMobile) setShowPhoto(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      setStream(s);
      setCameraOn(true);
      // Small delay to let DOM render the video element
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 80);
    } catch {
      setToast({ type:"error", msg:"Camera access denied" });
    }
  };

  // Capture: draw to canvas, convert to base64
  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width  = v.videoWidth  || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0);
    // Store as raw base64 (no data: prefix) — backend sends to SP in VPhotoPath
    const dataUrl = c.toDataURL("image/jpeg", 0.8);
    const b64     = dataUrl.split(",")[1];
    setForm(p => ({ ...p, photo: b64 }));
    closeCam();
  };

  const closeCam = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOn(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name   = "Name is required";
    if (!form.mobile.trim()) e.mobile = "Mobile is required";
    else if (!isValidMobile(form.mobile)) e.mobile = "Enter valid 10-digit mobile";
    const idErr = validateIdProof(form.idType, form.idNumber);
    if (idErr) { setIdAlert(idErr); return null; }
    if (!form.photo) e.photo = "Photo is required";
    return e;
  };

  const onSave = async () => {
    const errs = validate();
    if (errs === null) return;
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.photo && isMobile) setShowPhoto(true);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await updateVisitor(id, form);
      else        await createVisitor(form);
      setToast({ type:"success", msg: isEdit ? "Visitor updated" : "Visitor registered" });
      setTimeout(() => navigate("/visitors"), 1200);
    } catch (err) {
      setToast({ type:"error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  const onOut = async () => {
    try {
      await markVisitorOut(id, form);
      setToast({ type:"success", msg:"Out time saved" });
      setTimeout(() => navigate("/visitors"), 1000);
    } catch { setToast({ type:"error", msg:"Failed" }); }
  };

  const alreadyOut = Boolean(form.outTime);

  // Photo section — tap box → open camera directly (#4 fix)
  const PhotoSection = () => (
    <div>
      {cameraOn ? (
        <div>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width:"100%", borderRadius:"var(--radius-sm)", background:"#000", display:"block" }}/>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={capture}>
              <Camera size={15}/> Capture Photo
            </button>
            <button className="btn btn-ghost" onClick={closeCam}><X size={14}/> Cancel</button>
          </div>
        </div>
      ) : form.photo ? (
        <div>
          {/* Show captured/loaded photo */}
          <img
            src={`data:image/jpeg;base64,${form.photo}`}
            alt="Visitor"
            style={{ width:"100%", borderRadius:"var(--radius-sm)", objectFit:"cover",
              maxHeight:320, display:"block", border:"2px solid var(--accent)" }}
            onError={e => {
              // Photo exists but may be truncated from DB — show retake prompt
              e.target.style.display = "none";
              e.target.nextSibling && (e.target.nextSibling.style.display = "block");
            }}
          />
          <div style={{display:"none",padding:16,textAlign:"center",
            background:"var(--surface2)",borderRadius:"var(--radius-sm)",
            border:"1px dashed var(--border2)"}}>
            <p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>
              Photo saved in DB — retake to update
            </p>
            <button className="btn btn-ghost btn-sm" onClick={openCam}>
              <Camera size={13}/> Retake Photo
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width:"100%", marginTop:8 }} onClick={openCam}>
            <Camera size={13}/> Retake Photo
          </button>
        </div>
      ) : (
        // Tap to open camera directly — no extra button needed
        <div
          onClick={openCam}
          style={{
            width:"100%", aspectRatio:"4/3",
            background:"var(--surface2)",
            border:`2px dashed ${errors.photo ? "var(--red)" : "var(--border2)"}`,
            borderRadius:"var(--radius)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10,
            cursor:"pointer",
          }}>
          <Camera size={32} style={{ color: errors.photo ? "var(--red)" : "var(--text3)" }}/>
          <span style={{ fontSize:13, color: errors.photo ? "var(--red)" : "var(--text3)" }}>
            {errors.photo ? "Photo required — Tap to capture" : "Tap to open camera"}
          </span>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="spinner-page"><div className="spinner"/></div>;

  return (
    <div>
      {/* ID validation modal */}
      {idAlert && (
        <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.7)" }}>
          <div style={{ background:"var(--surface)", borderRadius:"var(--radius-sm)", padding:24, maxWidth:300, width:"90%", border:"1px solid var(--border)" }}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>ID Validation Error</div>
            <div style={{ fontSize:14, color:"var(--text2)", marginBottom:20, lineHeight:1.5 }}>{idAlert}</div>
            <button className="btn btn-primary" style={{ width:"100%" }}
              onClick={() => { setIdAlert(""); setTimeout(() => document.querySelector('[name="idNumber"]')?.focus(), 100); }}>
              OK — Fix ID Number
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)}/>
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>{isEdit ? "Edit Visitor" : "New Visitor"}</h1></div>
        <button className="btn btn-ghost" onClick={() => navigate("/visitors")}><ArrowLeft size={15}/> Back</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 220px", gap:16, alignItems:"start" }}>
        {/* Main form */}
        <div className="card">
          <div className="card-header" style={{ flexWrap:"wrap", gap:8 }}>
            <span className="card-title"><UserCheck size={16}/>{isEdit ? "Edit" : "New"} Visitor</span>
            {/* Gate dropdown — desktop only */}
            {!isMobile && gates.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
                <label style={{ fontSize:12, color:"var(--text2)", fontWeight:600 }}>Gate</label>
                <select name="gateUid" className="form-input" style={{ width:150 }}
                  value={form.gateUid || ""} onChange={onChange}>
                  <option value="">— Select Gate —</option>
                  {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Mobile + Name */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mobile <span className="req">*</span></label>
              <div className="input-group">
                <input name="mobile"
                  className={`form-input ${errors.mobile ? "err" : ""}`}
                  value={form.mobile} onChange={onChange}
                  placeholder="10-digit mobile" inputMode="numeric" maxLength={10}/>
                <button className="btn btn-ghost" onClick={handleMobileSearch} disabled={searching}>
                  {searching ? <span className="spin-sm"/> : <Search size={14}/>} Search
                </button>
              </div>
              {errors.mobile && <div className="form-error">{errors.mobile}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Name <span className="req">*</span></label>
              <input name="name" className={`form-input ${errors.name ? "err" : ""}`}
                value={form.name} onChange={onChange} placeholder="Full name"/>
              {errors.name && <div className="form-error">{errors.name}</div>}
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
              <label className="form-label">
                ID Number
                {form.idType && (
                  <span style={{ fontSize:10, color:"var(--text3)", marginLeft:6 }}>
                    {form.idType === "Aadhar" ? "(12 digits)" : form.idType === "PAN" ? "(10 chars)" : "(max 25)"}
                  </span>
                )}
              </label>
              <input name="idNumber" className="form-input"
                value={form.idNumber} onChange={onChange}
                inputMode={form.idType === "Aadhar" ? "numeric" : "text"}
                placeholder={!form.idType ? "Select ID type first" : form.idType === "Aadhar" ? "12 digits" : form.idType === "PAN" ? "ABCDE1234F" : "ID number"}
                disabled={!form.idType}/>
            </div>
          </div>

          {/* Type + Count */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Visitor Type</label>
              <select name="visitorType" className="form-input" value={form.visitorType} onChange={onChange}>
                <option value="">— Select Type —</option>
                {VISIT_TYPES.map(t => <option key={t}>{t}</option>)}
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
              <input name="company" className="form-input" value={form.company}
                onChange={onChange} placeholder="Company name"/>
            </div>
            <div className="form-group">
              <label className="form-label">To Meet</label>
              <input name="toMeet" className="form-input" value={form.toMeet}
                onChange={onChange} placeholder="Person to meet"/>
            </div>
          </div>

          {/* Vehicle + Notes */}
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

          {/* Mobile photo section — inline in card */}
          {isMobile && (
            <div style={{ marginTop:8 }}>
              {!showPhoto ? (
                <button className="btn btn-ghost"
                  style={{ width:"100%", justifyContent:"center",
                    borderColor: errors.photo ? "var(--red)" : "",
                    color: errors.photo ? "var(--red)" : "" }}
                  onClick={() => { setShowPhoto(true); if (!cameraOn && !form.photo) openCam(); }}>
                  <Camera size={15}/>
                  {form.photo ? "View / Retake Photo" : `Add Photo${errors.photo ? " (Required)" : ""}`}
                </button>
              ) : (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <label className="form-label" style={{ margin:0 }}>
                      Photo <span className="req">*</span>
                    </label>
                    {!cameraOn && (
                      <button className="modal-close" onClick={() => setShowPhoto(false)}>
                        <ChevronUp size={16}/>
                      </button>
                    )}
                  </div>
                  <PhotoSection/>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop: photo panel */}
        {!isMobile && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Camera size={15}/> Photo <span className="req">*</span></span>
            </div>
            <PhotoSection/>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:16 }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving
            ? <><span className="spin-sm"/> Saving...</>
            : <><Save size={15}/>{isEdit ? "Save Changes" : "Register Visitor"}</>}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate("/visitors")}>
          <ArrowLeft size={14}/> Back
        </button>
        {isEdit && !alreadyOut && (
          <button className="btn btn-danger" onClick={onOut}>
            <LogOut size={14}/> Save Out Time
          </button>
        )}
      </div>
    </div>
  );
}