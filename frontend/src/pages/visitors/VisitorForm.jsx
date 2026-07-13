import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getVisitorById, getVisitorByMobile, createVisitor, updateVisitor, markVisitorOut } from "../../services/visitorService";
import { getDropdown } from "../../services/setupService";
import Toast from "../../components/Toast";
import { ArrowLeft, Camera, Search, LogOut, Save, UserCheck } from "lucide-react";

const EMPTY = { mobile:"", visitorType:"", visitorId:"", name:"", company:"", toMeet:"", remarks:"", vehicleNo:"", passNo:"", photo:"", active:1 };

export default function VisitorForm() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const videoRef = useRef(null);
  const canvasRef= useRef(null);

  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [toast, setToast]   = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState(null);
  const [toMeetList, setTML] = useState([]);
  const [tmSearch, setTMSearch] = useState("");
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    getDropdown("securities").then(r => { if (r?.data) setTML(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getVisitorById(id).then(r => {
      if (r?.data) {
        const d = r.data;
        setForm({ mobile:d.Mobile||d.mobile||"", visitorType:d.VisitorType||d.visitorType||"", visitorId:d.VisitorId||d.visitorId||"", name:d.Name||d.name||"", company:d.Company||d.company||"", toMeet:d.ToMeet||d.toMeet||"", remarks:d.Remarks||d.remarks||"", vehicleNo:d.VehicleNo||d.vehicleNo||"", passNo:d.PassNo||d.passNo||"", photo:d.Photo||d.photo||"", active:d.Active??1 });
        setExisting(d);
      }
    }).finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => { const { name, value } = e.target; setForm(p => ({...p,[name]:value})); if(errors[name]) setErrors(p=>({...p,[name]:""})); };

  const handleGet = async () => {
    if (!form.mobile.trim()) return;
    try {
      const r = await getVisitorByMobile(form.mobile.trim());
      if (r?.data) { const d=r.data; setForm(p=>({...p, name:d.Name||d.name||p.name, company:d.Company||d.company||p.company, visitorType:d.VisitorType||d.visitorType||p.visitorType })); setToast({ type:"success", msg:"Visitor details auto-filled" }); }
    } catch {}
  };

  const openCam = async () => {
    try { const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } }); setStream(s); setCameraOn(true); setTimeout(() => { if(videoRef.current) videoRef.current.srcObject=s; },100); }
    catch { setToast({ type:"error", msg:"Camera access denied" }); }
  };
  const capture = () => {
    const v=videoRef.current, c=canvasRef.current; if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight; c.getContext("2d").drawImage(v,0,0);
    setForm(p=>({...p, photo:c.toDataURL("image/jpeg",0.75).split(",")[1]}));
    closeCam();
  };
  const closeCam = () => { if(stream) stream.getTracks().forEach(t=>t.stop()); setStream(null); setCameraOn(false); };

  const validate = () => { const e={}; if(!form.name.trim()) e.name="Name is required"; if(!form.mobile.trim()) e.mobile="Mobile is required"; return e; };

  const onSave = async () => {
    const errs=validate(); if(Object.keys(errs).length){ setErrors(errs); return; }
    setSaving(true);
    try {
      if (isEdit) { await updateVisitor(id, form); setToast({type:"success",msg:"Visitor updated"}); }
      else        { await createVisitor(form);      setToast({type:"success",msg:"Visitor registered"}); }
      setTimeout(() => navigate("/visitors"), 1200);
    } catch(err) { setToast({type:"error",msg:err.response?.data?.message||"Failed to save"}); }
    finally { setSaving(false); }
  };

  const onOut = async () => {
    try { await markVisitorOut(id); setToast({type:"success",msg:"Visitor checked out"}); setTimeout(()=>navigate("/visitors"),1000); }
    catch { setToast({type:"error",msg:"Failed to check out"}); }
  };

  const filteredTM = toMeetList.filter(t => (t.name||"").toLowerCase().includes(tmSearch.toLowerCase()));
  const alreadyOut = existing && Boolean(existing.OutTime||existing.outTime);

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)} />
      <canvas ref={canvasRef} style={{display:"none"}} />
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>{isEdit ? "Edit Visitor" : "New Visitor"}</h1>
          {form.passNo && <p>Pass: <span className="badge-pass" style={{marginLeft:4}}>{form.passNo}</span></p>}
        </div>
        <button className="btn btn-ghost" onClick={()=>navigate("/visitors")}><ArrowLeft size={15} /> Back</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start"}}>
        <div>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><span className="card-title"><UserCheck size={16} />Visitor Details</span></div>

            <div className="form-group">
              <label className="form-label">Mobile <span className="req">*</span></label>
              <div className="input-group">
                <input name="mobile" className={`form-input ${errors.mobile?"err":""}`} value={form.mobile} onChange={onChange} placeholder="Mobile number" />
                {!isEdit && <button className="btn btn-ghost" onClick={handleGet}><Search size={14} /> Get</button>}
              </div>
              {errors.mobile && <div className="form-error">{errors.mobile}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Visitor Type</label>
                <select name="visitorType" className="form-input" value={form.visitorType} onChange={onChange}>
                  <option value="">— Select Type —</option>
                  {["Guest","Vendor","Contractor","Delivery","Interview","Other"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID of Visitor</label>
                <input name="visitorId" className="form-input" value={form.visitorId} placeholder="Auto-generated" readOnly style={{opacity:.5}} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name <span className="req">*</span></label>
                <input name="name" className={`form-input ${errors.name?"err":""}`} value={form.name} onChange={onChange} placeholder="Full name" />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input name="company" className="form-input" value={form.company} onChange={onChange} placeholder="Company name" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">To Meet</label>
              <div className="dropdown-wrap">
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <Search size={14} style={{color:"var(--text3)",flexShrink:0}} />
                  <input className="form-input" placeholder="Search person to meet..." value={tmSearch||form.toMeet} onChange={e=>{ setTMSearch(e.target.value); setForm(p=>({...p,toMeet:e.target.value})); }} />
                </div>
                {tmSearch && filteredTM.length > 0 && (
                  <div className="dropdown-list">
                    {filteredTM.map(t=>(
                      <div key={t.id} className="dropdown-item" onClick={()=>{ setForm(p=>({...p,toMeet:t.name})); setTMSearch(""); }}>
                        <UserCheck size={13} style={{color:"var(--text3)"}} />{t.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vehicle No</label>
                <input name="vehicleNo" className="form-input" value={form.vehicleNo} onChange={onChange} placeholder="TN01AB1234" />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input name="remarks" className="form-input" value={form.remarks} onChange={onChange} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? <><span className="spin-sm"/>Saving...</> : <><Save size={15}/>{isEdit?"Save Changes":"Register Visitor"}</>}
            </button>
            <button className="btn btn-ghost" onClick={()=>navigate("/visitors")}><ArrowLeft size={14}/>Back</button>
            {isEdit && !alreadyOut && <button className="btn btn-danger" onClick={onOut}><LogOut size={14}/>Visitor Out</button>}
          </div>
        </div>

        {/* Photo column */}
        <div style={{width:220}}>
          <div className="card">
            <div className="card-header"><span className="card-title"><Camera size={16}/>Photo</span></div>
            {cameraOn ? (
              <div>
                <video ref={videoRef} autoPlay playsInline style={{width:"100%",borderRadius:"var(--radius-sm)",background:"#000"}} />
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={capture}><Camera size={13}/>Capture</button>
                  <button className="btn btn-ghost btn-sm" onClick={closeCam}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="photo-box" onClick={openCam} style={{aspectRatio:"3/4"}}>
                {form.photo
                  ? <img src={`data:image/jpeg;base64,${form.photo}`} alt="Visitor" />
                  : <><Camera size={28} style={{color:"var(--text3)"}}/><span className="photo-box-text">Tap to capture</span></>}
              </div>
            )}
            {form.photo && !cameraOn && (
              <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:10}} onClick={openCam}><Camera size={13}/>Retake</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
