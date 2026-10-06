import React, { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import { uploadSecurityPhoto } from "../../services/photoService";
import Toast from "../../components/Toast";
import api from "../../services/api";
import { Plus, Pencil, Trash2, X, Save, Camera, Eye, RefreshCw, Shield, Upload, UserCheck } from "lucide-react";

// ── Face model loader (module-level, loads once) ───────────────
let faceModelsLoaded = false;
async function loadFaceModels() {
  if (faceModelsLoaded) return;
  const base = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(base),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(base),
    faceapi.nets.faceRecognitionNet.loadFromUri(base),
  ]);
  faceModelsLoaded = true;
}

const FACE_STEPS = [
  { label: "Look Straight",       instruction: "Face the camera directly" },
  { label: "Turn Slightly Left",  instruction: "Turn your head slightly left" },
  { label: "Turn Slightly Right", instruction: "Turn your head slightly right" },
  { label: "Tilt Up Slightly",    instruction: "Tilt your head slightly up" },
  { label: "Look Down Slightly",  instruction: "Tilt your head slightly down" },
];

// ── Safe normalise — handles PhotoPath as JSON (with descriptors), array, or plain URL ──
function normalise(r) {
  try {
    const rawPhoto = r.PhotoPath ?? r.photopath ?? r.photo ?? "";
    let photo = "";
    let hasFace = false;
    let rawDescriptors = [];

    if (Array.isArray(rawPhoto)) {
      photo = rawPhoto.find(p => p && !String(p).startsWith("/Security/")) || "";
    } else {
      const s = String(rawPhoto || "");
      if (s.startsWith("{")) {
        try {
          const parsed = JSON.parse(s);
          photo = parsed.photo || "";
          if (Array.isArray(parsed.descriptors) && parsed.descriptors.length > 0) {
            hasFace = true;
            rawDescriptors = parsed.descriptors;
          }
        } catch {}
      } else {
        photo = s.startsWith("/Security/") ? "" : s;
      }
    }

    const mob1 = String(r.smobile1 ?? r.Smobile1 ?? r.SMobile1 ?? 0);
    const mob2 = String(r.smobile2 ?? r.SMobile2 ?? 0);
    const cleanMob = v => { if(!v||v==="0")return ""; const d=v.replace(/\D/g,""); return d.slice(-10)||""; };
    return {
      uid:            Number(r.uid ?? r.UId ?? r.Uid ?? 0),
      scode:          String(r.scode    ?? r.SCode    ?? ""),
      sname:          String(r.sname    ?? r.SName    ?? ""),
      gender:         String(r.gender   ?? r.Gender   ?? ""),
      smobile1:       cleanMob(mob1),
      smobile2:       cleanMob(mob2),
      address1:       r.Address1 ?? r.address1 ?? "",
      address2:       r.Address2 ?? r.address2 ?? "",
      address3:       r.Address3 ?? r.address3 ?? "",
      address4:       r.Address4 ?? r.address4 ?? "",
      address5:       r.Address5 ?? r.address5 ?? "",
      spassword:      String(r.spassword ?? r.SPassword ?? ""),
      photo,
      hasFace,
      rawDescriptors,
      active:         Boolean(r.active ?? r.Active ?? true),
    };
  } catch(e) {
    console.error("[normalise] error:", e, r);
    return { uid:Number(r.uid??0), scode:"", sname:String(r.sname??r.SName??""), gender:"", smobile1:"", smobile2:"", address1:"", address2:"", address3:"", address4:"", address5:"", spassword:"", photo:"", hasFace:false, rawDescriptors:[], active:true };
  }
}

const EMPTY = { uid:0, scode:"", sname:"", gender:"", smobile1:"", smobile2:"", spassword:"", address1:"", address2:"", address3:"", address4:"", address5:"", photo:"", photoUrl:"", faceDescriptors:null, faceDescriptorsSaved:false, active:true };

function getPhotoSrc(p) {
  if (!p) return null;
  const s = String(p).trim();
  if (!s || s.startsWith("/Security/") || s.startsWith("{")) return null;
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  if (s.length > 100) return `data:image/jpeg;base64,${s}`;
  return null;
}

function PhotoStamp({ photo, name, size=32 }) {
  const src = getPhotoSrc(photo);
  const initials = (name||"S").slice(0,2).toUpperCase();
  if (src) return <img src={src} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"1.5px solid var(--accent)"}} onError={e=>e.target.style.display="none"}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid var(--border2)",flexShrink:0}}><span style={{fontSize:size*0.33,fontWeight:700,color:"var(--accent)"}}>{initials}</span></div>;
}

// ── 5-angle Face Registration Modal ───────────────────────────
function FaceRegistrationModal({ onDone, onCancel }) {
  const [stepIdx, setStepIdx]         = useState(0);
  const [captured, setCaptured]       = useState([]);
  const [stream, setStream]           = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing]     = useState(false);
  const [initError, setInitError]     = useState(null);
  const [retryKey, setRetryKey]       = useState(0);
  const videoRef    = useRef(null);
  const detectRef   = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitError(null); setModelsReady(false);
      try { await loadFaceModels(); }
      catch { if (!cancelled) setInitError("Face AI models failed to load — check your connection."); return; }
      if (cancelled) return;
      setModelsReady(true);
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width:{ideal:640}, height:{ideal:480} },
          audio: false,
        });
        if (!cancelled) setStream(s);
      } catch(e) {
        const msgs = { NotAllowedError:"Camera permission denied", NotFoundError:"No camera found", NotReadableError:"Camera in use by another app — close it and retry" };
        if (!cancelled) setInitError(msgs[e.name] || `Camera error: ${e.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]); // eslint-disable-line

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => () => {
    if (detectRef.current) clearInterval(detectRef.current);
    stream?.getTracks().forEach(t => t.stop());
  }, [stream]);

  // Continuous face detection while camera is live
  useEffect(() => {
    if (!modelsReady || !stream) return;
    detectRef.current = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.readyState !== 4) return;
      try {
        const d = await faceapi.detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })).withFaceLandmarks(true);
        setFaceDetected(!!d);
      } catch { setFaceDetected(false); }
    }, 400);
    return () => { if (detectRef.current) { clearInterval(detectRef.current); detectRef.current = null; } };
  }, [modelsReady, stream]);

  const doCapture = async () => {
    const v = videoRef.current;
    if (!v || v.readyState !== 4 || capturing) return;
    setCapturing(true);
    try {
      const det = await faceapi
        .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!det) { setCapturing(false); return; }
      const newCaptured = [...captured, det.descriptor];
      setCaptured(newCaptured);
      if (newCaptured.length < FACE_STEPS.length) {
        setStepIdx(newCaptured.length);
        setFaceDetected(false);
      } else {
        stream?.getTracks().forEach(t => t.stop());
        onDone(newCaptured);
      }
    } catch { /* ignore */ }
    setCapturing(false);
  };

  const doRetry = () => {
    if (detectRef.current) { clearInterval(detectRef.current); detectRef.current = null; }
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setFaceDetected(false); setCapturing(false);
    setInitError(null); setCaptured([]); setStepIdx(0);
    setRetryKey(k => k+1);
  };

  const step = FACE_STEPS[stepIdx] || FACE_STEPS[0];
  const ringColor = faceDetected ? "#22c55e" : "#475569";
  const ringGlow  = faceDetected ? "0 0 16px rgba(34,197,94,0.45)" : "none";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", width:"min(400px,96vw)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"14px 16px 6px", textAlign:"center" }}>
          <div style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>Register Face — {stepIdx+1} / {FACE_STEPS.length}</div>
          <div style={{ fontSize:13, color:"var(--accent)", fontWeight:700, marginTop:4 }}>{step.label}</div>
          <div style={{ fontSize:11, color:"var(--text2)", marginBottom:8 }}>{step.instruction}</div>
          {/* Progress dots */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:4 }}>
            {FACE_STEPS.map((_,i) => (
              <div key={i} style={{ width:10, height:10, borderRadius:"50%", transition:"background 0.2s",
                background: i < captured.length ? "#22c55e" : i === stepIdx ? "var(--accent)" : "var(--border)" }}/>
            ))}
          </div>
        </div>

        {initError ? (
          <div style={{ margin:"8px 16px 12px", padding:"10px 12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius-xs)" }}>
            <div style={{ fontSize:12, color:"var(--red)", marginBottom:8 }}>{initError}</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={doRetry} style={{ flex:1, padding:"7px 0", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-xs)", fontSize:12, fontWeight:700, cursor:"pointer" }}>Retry</button>
              <button onClick={onCancel} style={{ flex:1, padding:"7px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-xs)", fontSize:12, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ position:"relative", background:"#000", aspectRatio:"4/3" }}>
              <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} playsInline muted autoPlay/>
              <div style={{ position:"absolute", left:"12%", right:"12%", top:"6%", bottom:"6%", borderRadius:"50%", border:`3px solid ${ringColor}`, transition:"border-color 0.25s, box-shadow 0.25s", boxShadow:ringGlow, pointerEvents:"none" }}/>
              <div style={{ position:"absolute", bottom:8, left:0, right:0, textAlign:"center", fontSize:12, fontWeight:700, color: faceDetected ? "#22c55e" : "#94a3b8" }}>
                {!modelsReady ? "Loading face AI…" : faceDetected ? "Face detected — tap Capture" : "Position your face in the oval"}
              </div>
            </div>
            <div style={{ padding:"10px 16px 12px" }}>
              <button
                onClick={doCapture}
                disabled={!faceDetected || capturing}
                style={{ width:"100%", padding:"12px 0", background: faceDetected && !capturing ? "#2563eb" : "var(--border)", color: faceDetected && !capturing ? "#fff" : "var(--text2)", border:"none", borderRadius:"var(--radius-sm)", fontSize:14, fontWeight:700, cursor: faceDetected && !capturing ? "pointer" : "not-allowed", transition:"background 0.2s" }}>
                {capturing ? "Capturing…" : `Capture (${stepIdx+1} of ${FACE_STEPS.length})`}
              </button>
            </div>
          </>
        )}
        <button onClick={onCancel} style={{ display:"block", width:"100%", padding:"9px 0", background:"none", color:"var(--text2)", border:"none", borderTop:"1px solid var(--border)", fontSize:12, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function Securities() {
  const [rows,setRows]               = useState([]);
  const [loading,setLoading]         = useState(true);
  const [toast,setToast]             = useState(null);
  const [showForm,setShowForm]       = useState(false);
  const [form,setForm]               = useState(EMPTY);
  const [errors,setErrors]           = useState({});
  const [saving,setSaving]           = useState(false);
  const [uploading,setUploading]     = useState(false);
  const [cameraOn,setCameraOn]       = useState(false);
  const [viewRow,setViewRow]         = useState(null);
  const [showFaceReg,setShowFaceReg] = useState(false);
  const videoRef = useRef(null);
  const [stream,setStream]           = useState(null);
  const fileRef  = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, faceRes] = await Promise.all([
        api.get("/setup/securities"),
        api.get("/setup/securities/facedata?uid=0"),
      ]);
      const raw      = secRes.data?.data  || [];
      const faceRows = faceRes.data?.data || [];
      const faceUids = new Set(faceRows.map(f => Number(f.Uid ?? f.uid ?? 0)).filter(Boolean));
      setRows(raw.map(r => {
        const n = normalise(r);
        return { ...n, hasFace: faceUids.has(n.uid) };
      }));
    } catch(e) {
      console.error("[Securities load]", e);
      setToast({type:"error", msg:"Failed to load: " + (e.response?.data?.message || e.message)});
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setErrors({}); setCameraOn(false); setShowFaceReg(false); setShowForm(true); };
  const openEdit = async row => {
    const src = getPhotoSrc(row.photo);
    // Fetch face data from dedicated SP
    let existingDescriptors = null;
    try {
      const faceRes = await api.get(`/setup/securities/facedata?uid=${row.uid}`);
      const faceRows = faceRes.data?.data || [];
      if (faceRows.length > 0) {
        const raw = faceRows[0].FData ?? faceRows[0].fdata ?? faceRows[0].FaceData ?? faceRows[0].facedata ?? null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.descriptors) && parsed.descriptors.length > 0) {
            existingDescriptors = parsed.descriptors.map(d => new Float32Array(d));
          }
        }
      }
    } catch { /* no face data or fetch error — treat as unregistered */ }
    setForm({ ...EMPTY, ...row, photoUrl: src && src.startsWith("http") ? row.photo : "", photo: "", faceDescriptors: existingDescriptors, faceDescriptorsSaved: !!existingDescriptors });
    setErrors({}); setCameraOn(false); setShowFaceReg(false); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setCameraOn(false); setShowFaceReg(false); stream?.getTracks().forEach(t=>t.stop()); setStream(null); };
  const onChange  = e => { setForm(p=>({...p,[e.target.name]:e.target.value})); if(errors[e.target.name])setErrors(p=>({...p,[e.target.name]:""})); };

  const openCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      setStream(s); setCameraOn(true);
      setTimeout(()=>{ if(videoRef.current) videoRef.current.srcObject=s; },80);
    } catch { setToast({type:"error",msg:"Camera access denied"}); }
  };

  const capture = async () => {
    const v=videoRef.current; if(!v) return;
    const c=document.createElement("canvas");
    c.width=v.videoWidth||640; c.height=v.videoHeight||480;
    c.getContext("2d").drawImage(v,0,0);
    const b64=c.toDataURL("image/jpeg",0.8).split(",")[1];
    stream?.getTracks().forEach(t=>t.stop()); setStream(null); setCameraOn(false);
    await handleUpload(b64);
  };

  const handleFileUpload = async e => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=async ev=>{ await handleUpload(ev.target.result.split(",")[1]); };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (b64) => {
    setUploading(true);
    setToast({type:"info",msg:"Uploading photo..."});
    try {
      const url = await uploadSecurityPhoto(b64, form.uid||"new");
      setForm(p=>({...p,photo:"",photoUrl:url}));
      setToast({type:"success",msg:"Photo uploaded ✓"});
    } catch { setToast({type:"error",msg:"Upload failed"}); }
    finally { setUploading(false); }
  };

  const handleFaceRegDone = (descriptors) => {
    setShowFaceReg(false);
    setForm(p => ({ ...p, faceDescriptors: descriptors, faceDescriptorsSaved: false }));
    setToast({ type:"info", msg:`${descriptors.length} angles captured — click Save to store` });
  };

  const onSave = async () => {
    const errs={};
    if(!form.sname.trim())  errs.sname="Name is required";
    if(!form.gender)        errs.gender="Gender is required";
    if(form.smobile1 && form.smobile1.length !== 10) errs.smobile1="Mobile 1 must be exactly 10 digits";
    if(form.smobile2 && form.smobile2.length !== 10) errs.smobile2="Mobile 2 must be exactly 10 digits";
    if(Object.keys(errs).length){setErrors(errs);return;}
    setSaving(true);
    try {
      const now=new Date();
      const localNow=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}.${String(now.getMilliseconds()).padStart(3,"0")}`;

      // PhotoPath stores photo URL only — face data is saved separately via PR_Update_Facedata
      const photoUrl = form.photoUrl || form.photo || "";
      const photoPath = photoUrl || "/Security/";

      const payload = JSON.stringify({
        UId:       form.uid||0,
        SCode:     form.scode||"",
        SName:     form.sname||"",
        Gender:    form.gender||"",
        Smobile1:  form.smobile1 ? Number(String(form.smobile1).replace(/\D/g,""))||0 : 0,
        SMobile2:  form.smobile2 ? Number(String(form.smobile2).replace(/\D/g,""))||0 : 0,
        SPassword: form.spassword||"",
        Address1:  form.address1||"",
        Address2:  form.address2||"",
        Address3:  form.address3||null,
        Address4:  form.address4||null,
        Address5:  form.address5||null,
        PhotoPath: photoPath,
        Active:    form.active!==false?1:0,
        Companyid: 1,
        CreatedBy: 1,
        CreatedOn: localNow,
        DeletedBy: null,
        DeletedOn: null,
      });
      const r = await api.post("/setup/securities",{json:payload});
      if(r.data?.success===false){setToast({type:"error",msg:r.data.message||"Failed"});return;}

      // Save face data separately via PR_Update_Facedata (edit mode only, only when newly captured)
      if (form.uid > 0 && form.faceDescriptors?.length > 0 && !form.faceDescriptorsSaved) {
        try {
          const faceData = JSON.stringify({
            descriptors: form.faceDescriptors.map(d =>
              Array.from(d).map(v => Math.round(v * 100) / 100)
            ),
          });
          await api.put(`/setup/securities/${form.uid}/facedata`, { faceData });
        } catch(fe) {
          setToast({type:"error", msg:"Guard saved but face data failed to save — try again"});
          setSaving(false); return;
        }
      }

      setToast({type:"success",msg:form.uid?"Security updated":"Security added"});
      closeForm(); load();
    } catch(err){ setToast({type:"error",msg:err.response?.data?.message||"Failed"}); }
    finally{setSaving(false);}
  };

  const onDelete = async uid => {
    if(!confirm("Delete this security record?"))return;
    try{await api.delete(`/setup/securities/${uid}`);setToast({type:"success",msg:"Deleted"});load();}
    catch{setToast({type:"error",msg:"Failed to delete"});}
  };

  const photoSrc = form.photoUrl ? form.photoUrl : form.photo ? `data:image/jpeg;base64,${form.photo}` : null;

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFileUpload}/>

      {showFaceReg && (
        <FaceRegistrationModal
          onDone={handleFaceRegDone}
          onCancel={() => setShowFaceReg(false)}
        />
      )}

      <div className="page-hdr">
        <div className="page-hdr-left"><h1>Securities</h1><p>{rows.length} record{rows.length!==1?"s":""}</p></div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15}/> New Security</button>
        </div>
      </div>

      {loading?<div className="spinner-page"><div className="spinner"/></div>
      :rows.length===0?<div className="empty-state"><div className="empty-icon"><Shield size={22}/></div><h3>No security records</h3></div>
      :(
        <div className="table-wrap"><table style={{minWidth:600}}>
          <thead><tr>
            <th style={{fontWeight:700}}>Photo</th>
            <th style={{fontWeight:700}}>Name</th>
            <th style={{fontWeight:700}}>Status</th>
            <th style={{fontWeight:700}}>Face</th>
            <th style={{fontWeight:700}}>Code</th>
            <th style={{fontWeight:700}}>Gender</th>
            <th style={{fontWeight:700}}>Mobile</th>
            <th style={{fontWeight:700,width:120}}>Actions</th>
          </tr></thead>
          <tbody>
            {rows.map(row=>(
              <tr key={row.uid} onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td><PhotoStamp photo={row.photo} name={row.sname}/></td>
                <td style={{fontWeight:600}}>{row.sname||"—"}</td>
                <td>{row.active?<span className="badge badge-in">Active</span>:<span className="badge badge-out">Inactive</span>}</td>
                <td>
                  {row.hasFace
                    ? <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700,color:"#22c55e"}}><UserCheck size={12}/>Registered</span>
                    : <span style={{fontSize:11,color:"var(--text3)"}}>—</span>
                  }
                </td>
                <td className="td-muted" style={{ fontWeight:700, color:"var(--text)" }}>{row.scode||"—"}</td>
                <td>{row.gender||"—"}</td>
                <td className="td-muted" style={{ fontWeight:700, color:"var(--text)" }}>{row.smobile1||"—"}</td>
                <td><div style={{display:"flex",gap:4}}>
                  <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}><Pencil size={11}/> Edit</button>
                  <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)}><Eye size={11}/> View</button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={()=>onDelete(row.uid)}><Trash2 size={11}/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
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
              <div style={{marginBottom:16,padding:16,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
                <label className="form-label" style={{marginBottom:10}}>Photo {uploading&&<span style={{fontSize:11,color:"var(--accent)",marginLeft:8}}>Uploading...</span>}</label>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <PhotoStamp photo={photoSrc||""} name={form.sname||"?"} size={64}/>
                  <div style={{flex:1}}>
                    {cameraOn?(
                      <div>
                        <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}}/>
                        <div style={{display:"flex",gap:8,marginTop:8}}>
                          <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/> Capture</button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>{stream?.getTracks().forEach(t=>t.stop());setStream(null);setCameraOn(false);}}>Cancel</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <button className="btn btn-ghost btn-sm" onClick={openCam} disabled={uploading}><Camera size={13}/>{photoSrc?"Retake":"Capture"}</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}><Upload size={13}/> Upload</button>
                        {photoSrc&&<span style={{fontSize:11,color:"var(--green)",alignSelf:"center"}}>✓ {form.photoUrl?.startsWith("http")?"Cloudinary":"Captured"}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Face Registration — edit mode only (uid > 0) */}
              {form.uid > 0 && <div style={{marginBottom:20,padding:16,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:`1px solid ${form.faceDescriptors?.length>0?(form.faceDescriptorsSaved?"#22c55e":"#f59e0b"):"var(--border)"}`}}>
                <label className="form-label" style={{marginBottom:8}}>Face Registration (for patrol verification)</label>
                {form.faceDescriptors?.length > 0 ? (
                  form.faceDescriptorsSaved ? (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#22c55e",fontWeight:700}}>
                        <UserCheck size={16}/> {form.faceDescriptors.length} angles registered ✓
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setShowFaceReg(true)}>Re-register</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#f59e0b",fontWeight:700,marginBottom:8}}>
                        <UserCheck size={16}/> {form.faceDescriptors.length} angles captured — click Save to store
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setShowFaceReg(true)}>Re-capture</button>
                    </div>
                  )
                ) : (
                  <div>
                    <div style={{fontSize:12,color:"var(--text2)",marginBottom:10}}>Capture 5 face angles for identity verification during patrol. No photo needed.</div>
                    <button className="btn btn-primary btn-sm" onClick={()=>setShowFaceReg(true)}>
                      <Camera size={13}/> Register Face (5 angles)
                    </button>
                  </div>
                )}
              </div>}

              <div className="form-row">
                <div className="form-group"><label className="form-label">Security Code</label><input name="scode" className="form-input" value={form.scode} onChange={onChange} placeholder="S001"/></div>
                <div className="form-group">
                  <label className="form-label">Gender <span className="req">*</span></label>
                  <select name="gender" className={`form-input ${errors.gender?"err":""}`} value={form.gender} onChange={onChange}>
                    <option value="">— Select —</option><option>Male</option><option>Female</option><option>Other</option>
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
                  <label className="form-label">
                    Mobile 1
                    {form.smobile1 && form.smobile1.length > 0 && form.smobile1.length !== 10 && <span style={{fontSize:10,color:"var(--red)",marginLeft:6}}>must be 10 digits</span>}
                  </label>
                  <input name="smobile1"
                    className={`form-input ${errors.smobile1 || (form.smobile1 && form.smobile1.length > 0 && form.smobile1.length !== 10) ? "err" : ""}`}
                    value={form.smobile1||""} inputMode="numeric" maxLength={10}
                    placeholder="10-digit mobile"
                    onChange={e=>{ const v=e.target.value.replace(/[^0-9]/g,"").slice(0,10); setForm(p=>({...p,smobile1:v})); setErrors(p=>({...p,smobile1:""})); }}/>
                  {errors.smobile1 && <div className="form-error">{errors.smobile1}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Mobile 2
                    {form.smobile2 && form.smobile2.length > 0 && form.smobile2.length !== 10 && <span style={{fontSize:10,color:"var(--red)",marginLeft:6}}>must be 10 digits</span>}
                  </label>
                  <input name="smobile2"
                    className={`form-input ${errors.smobile2 || (form.smobile2 && form.smobile2.length > 0 && form.smobile2.length !== 10) ? "err" : ""}`}
                    value={form.smobile2||""} inputMode="numeric" maxLength={10}
                    placeholder="Optional"
                    onChange={e=>{ const v=e.target.value.replace(/[^0-9]/g,"").slice(0,10); setForm(p=>({...p,smobile2:v})); setErrors(p=>({...p,smobile2:""})); }}/>
                  {errors.smobile2 && <div className="form-error">{errors.smobile2}</div>}
                </div>
              </div>
              <div className="form-group"><label className="form-label">Password</label><input name="spassword" className="form-input" value={form.spassword} onChange={onChange} placeholder="Login password"/></div>
              <div style={{marginBottom:8,fontWeight:600,fontSize:12,color:"var(--text2)"}}>Address</div>
              {["address1","address2","address3","address4","address5"].map((f,i)=>(
                <div className="form-group" key={f} style={{marginBottom:8}}><input name={f} className="form-input" value={form[f]||""} onChange={onChange} placeholder={`Address line ${i+1}`}/></div>
              ))}
              <div className="form-group">
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={form.active!==false} onChange={e=>setForm(p=>({...p,active:e.target.checked}))} style={{accentColor:"var(--accent)"}}/>
                  <span className="form-label" style={{margin:0}}>Active</span>
                </label>
              </div>
            </div>
            <div style={{position:"sticky",bottom:0,background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"14px 24px",display:"flex",gap:8}}>
              <button className="btn btn-primary" onClick={onSave} disabled={saving||uploading} style={{flex:1}}>{saving?<><span className="spin-sm"/>Saving...</>:<><Save size={15}/>Save</>}</button>
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
                  <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {viewRow.active?<span className="badge badge-in">Active</span>:<span className="badge badge-out">Inactive</span>}
                    {viewRow.hasFace&&<span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700,color:"#22c55e",padding:"2px 6px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:4}}><UserCheck size={11}/>Face Registered</span>}
                  </div>
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
