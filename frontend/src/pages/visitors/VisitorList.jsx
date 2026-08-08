import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useSortableTable } from "../../hooks/useSortableTable";
import { usePagePerms } from "../../hooks/usePagePerms";
import { useAuth } from "../../context/AuthContext";
import {
  getVisitors, markVisitorOut, deleteVisitor, updateVisitor, searchVisitors,
} from "../../services/visitorService";
import Toast from "../../components/Toast";
import SortableHeader from "../../components/SortableHeader";
import BottomNav from "../../components/BottomNav";
import {
  Plus, Search, RefreshCw, LogOut, Pencil,
  Users, Trash2, LayoutDashboard, X, Save, Eye,
} from "lucide-react";

const today   = () => new Date().toISOString().split("T")[0];
const fmtTime = v => {
  if (!v) return null;
  try { return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
  catch { return v; }
};
const isValidMobile   = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));
const isValidAadhar   = v => /^\d{12}$/.test(String(v).replace(/\s/g,""));
const isValidPAN      = v => /^[A-Z0-9]{10}$/i.test(String(v));
const isValidOthers   = v => String(v).trim().length >= 1 && String(v).trim().length <= 25;

function validateIdProof(t,n){
  if(!t||!n) return null;
  if(t==="Aadhar"&&!isValidAadhar(n)) return "Aadhar must be exactly 12 digits";
  if(t==="PAN"&&!isValidPAN(n))       return "PAN must be exactly 10 alphanumeric characters";
  if(t==="Others"&&!isValidOthers(n)) return "ID number must be 1–25 characters";
  return null;
}

const ID_TYPES    = ["Aadhar","PAN","Others"];
const VISIT_TYPES = ["Meeting","Guest","Vendor","Contractor","Delivery","Interview","Other"];

// ── PhotoStamp — outside component ───────────────────────────
function PhotoStamp({ row, size=32 }) {
  const initials = (row.name||"V").slice(0,2).toUpperCase();
  if (row.photo && !row.photo.startsWith("/")) {
    return (
      <img src={`data:image/jpeg;base64,${row.photo}`} alt={row.name}
        style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",
          border:"1.5px solid var(--accent)",display:"block",flexShrink:0}}/>
    );
  }
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"var(--accent-dim)",
      display:"flex",alignItems:"center",justifyContent:"center",
      border:"1.5px solid var(--border2)",flexShrink:0}}>
      <span style={{fontSize:size*0.33,fontWeight:700,color:"var(--accent)"}}>{initials}</span>
    </div>
  );
}

// ── Full screen photo viewer ──────────────────────────────────
function PhotoViewer({ photo, name, onClose }) {
  if (!photo || photo.startsWith("/")) return null;
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:600,
      background:"rgba(0,0,0,0.92)",
      display:"flex",alignItems:"center",justifyContent:"center",
    }}>
      <button onClick={onClose} style={{
        position:"absolute",top:16,right:16,
        background:"rgba(255,255,255,0.15)",border:"none",
        width:40,height:40,borderRadius:"50%",
        display:"flex",alignItems:"center",justifyContent:"center",
        cursor:"pointer",color:"#fff",
      }}><X size={20}/></button>
      <img src={`data:image/jpeg;base64,${photo}`} alt={name}
        style={{maxWidth:"90vw",maxHeight:"85dvh",borderRadius:12,objectFit:"contain"}}/>
      <div style={{position:"absolute",bottom:24,color:"rgba(255,255,255,0.7)",fontSize:14}}>{name}</div>
    </div>
  );
}

// ── ViewDrawer — outside component ───────────────────────────
function ViewDrawer({ row, onClose }) {
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const fmtDt = v => { if(!v) return "—"; try{return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return v;} };
  const isOut = Boolean(row.outTime);
  const hasPhoto = row.photo && !row.photo.startsWith("/");

  return (
    <>
      {showFullPhoto && <PhotoViewer photo={row.photo} name={row.name} onClose={()=>setShowFullPhoto(false)}/>}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(520px,92vw)",zIndex:401}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(520px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto",animation:"slideRight .25s ease"}}>
        <div style={{position:"sticky",top:0,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"var(--radius-sm)",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Eye size={16} style={{color:"var(--accent)"}}/>
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Visitor Details</div>
              <div style={{fontSize:11,color:"var(--text3)"}}>Full record view</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"var(--radius-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={15}/></button>
        </div>
        <div style={{padding:"16px 20px"}}>
          {/* Photo + identity — tap photo for full screen */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:14,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
            <div style={{cursor:hasPhoto?"pointer":"default",flexShrink:0}} onClick={()=>hasPhoto&&setShowFullPhoto(true)}>
              <PhotoStamp row={row} size={64}/>
              {hasPhoto && (
                <div style={{fontSize:9,color:"var(--accent)",textAlign:"center",marginTop:2}}>Tap to zoom</div>
              )}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{row.name||"—"}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:1}}>{row.mobile||"—"}</div>
              <div style={{marginTop:5}}>{isOut?<span className="badge badge-out">Checked Out</span>:<span className="badge badge-in">Inside</span>}</div>
            </div>
          </div>
          {[
            ["Visitor Type",  row.visitorType||"—"],
            ["Company",       row.company||"—"],
            ["To Meet",       row.toMeet||"—"],
            ["Vehicle No",    row.vehicleNo||"—"],
            ["ID Type",       row.idType||"—"],
            ["ID Number",     row.idNumber||"—"],
            ["Visitor Count", row.visitorCount||1],
            ["Notes",         row.notes||"—"],
            ["In Time",       fmtDt(row.inTime)],
            ["Out Time",      fmtDt(row.outTime)],
          ].map(([label,val])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:11,color:"var(--text3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",minWidth:100}}>{label}</span>
              <span style={{fontSize:13,color:"var(--text1)",textAlign:"right"}}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── MobileRowDrawer — outside component ──────────────────────
function MobileRowDrawer({ row, onClose, onSave, onOut, saving }) {
  const [form,setForm]       = useState({...row});
  const [errors,setErrors]   = useState({});
  const [idAlert,setIdAlert] = useState("");
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const isAlreadyOut = Boolean(row.outTime);
  const hasPhoto = row.photo && !row.photo.startsWith("/");

  const onChange = e => {
    let{name,value}=e.target;
    if(name==="idNumber"){
      if(form.idType==="Aadhar") value=value.replace(/\D/g,"").slice(0,12);
      if(form.idType==="PAN")    value=value.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,10);
      if(form.idType==="Others") value=value.slice(0,25);
    }
    if(name==="idType"){setForm(p=>({...p,idType:value,idNumber:""}));return;}
    setForm(p=>({...p,[name]:value}));
    if(errors[name]) setErrors(p=>({...p,[name]:""}));
  };

  const validate = ()=>{
    if(isAlreadyOut) return {};
    const e={};
    if(!form.name.trim()) e.name="Required";
    if(!form.mobile.trim()||!isValidMobile(form.mobile)) e.mobile="Valid 10-digit mobile";
    const idErr=validateIdProof(form.idType,form.idNumber);
    if(idErr){setIdAlert(idErr);return null;}
    return e;
  };

  const handleSave=()=>{
    const errs=validate();
    if(errs===null) return;
    if(Object.keys(errs).length){setErrors(errs);return;}
    onSave(form);
  };

  const fmtDt=v=>{if(!v)return"—";try{return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return v;}};

  return (
    <>
      {showFullPhoto&&<PhotoViewer photo={row.photo} name={row.name} onClose={()=>setShowFullPhoto(false)}/>}
      {idAlert&&(
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)"}}>
          <div style={{background:"var(--surface)",borderRadius:"var(--radius-sm)",padding:20,maxWidth:280,width:"90%",border:"1px solid var(--border)"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>ID Validation Error</div>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>{idAlert}</div>
            <button className="btn btn-primary" style={{width:"100%"}}
              onClick={()=>{setIdAlert("");setTimeout(()=>document.querySelector('[name="idNumber"]')?.focus(),100);}}>
              OK — Fix ID Number
            </button>
          </div>
        </div>
      )}
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,height:"15dvh",zIndex:401}}/>
      <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:402,background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90dvh",overflowY:"auto",animation:"slideUp .25s ease",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"8px 0 2px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"var(--border2)"}}/>
        </div>
        {/* Header with photo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Photo beside name — tap for full screen */}
            <div style={{cursor:hasPhoto?"pointer":"default"}} onClick={()=>hasPhoto&&setShowFullPhoto(true)}>
              <PhotoStamp row={row} size={40}/>
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{isAlreadyOut?"Edit Record":"Edit Visitor"}</div>
              <div style={{fontSize:11,color:"var(--text3)"}}>{row.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"var(--radius-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={13}/></button>
        </div>
        <div style={{padding:"12px 16px"}}>
          {isAlreadyOut&&(
            <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"8px 12px",marginBottom:12}}>
              <div style={{fontSize:10,color:"var(--text3)",fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Out Time</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--accent)"}}>{fmtDt(row.outTime)}</div>
              <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>Only Notes can be updated.</div>
            </div>
          )}
          {!isAlreadyOut&&(
            <>
              <div className="form-group">
                <label className="form-label">Mobile <span className="req">*</span></label>
                <input name="mobile" className={`form-input ${errors.mobile?"err":""}`} value={form.mobile} onChange={onChange} inputMode="numeric"/>
                {errors.mobile&&<div className="form-error">{errors.mobile}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Name <span className="req">*</span></label>
                <input name="name" className={`form-input ${errors.name?"err":""}`} value={form.name} onChange={onChange}/>
                {errors.name&&<div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ID Type</label>
                  <select name="idType" className="form-input" value={form.idType||""} onChange={onChange}>
                    <option value="">— ID —</option>
                    {ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number</label>
                  <input name="idNumber" className="form-input" value={form.idNumber||""} onChange={onChange}
                    inputMode={form.idType==="Aadhar"?"numeric":"text"}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select name="visitorType" className="form-input" value={form.visitorType||""} onChange={onChange}>
                    <option value="">— Type —</option>
                    {VISIT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Meet</label>
                  <input name="toMeet" className="form-input" value={form.toMeet||""} onChange={onChange}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input name="company" className="form-input" value={form.company||""} onChange={onChange}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle No</label>
                  <input name="vehicleNo" className="form-input" value={form.vehicleNo||""} onChange={onChange}/>
                </div>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input name="notes" className="form-input" value={form.notes||""} onChange={onChange} placeholder="Optional notes"/>
          </div>
        </div>
        <div style={{position:"sticky",bottom:0,background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"10px 16px 16px",display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{flex:1,padding:"10px"}}>
            {saving?<><span className="spin-sm" style={{borderColor:"rgba(0,0,0,.25)",borderTopColor:"#000"}}/>Saving...</>:<><Save size={14}/>Save</>}
          </button>
          {!isAlreadyOut&&<button className="btn btn-danger" onClick={()=>onOut(row)} style={{padding:"10px 12px",fontSize:12}}><LogOut size={13}/>Save Out Time</button>}
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────
export default function VisitorList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const { canWrite, canUpdate, canDelete } = usePagePerms();
  const { user } = useAuth();

  const [date, setDate]         = useState(today());
  const [filter, setFilter]     = useState("All");
  const [rows, setRows]         = useState([]);
  const [q, setQ]               = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [globalRows, setGlobalRows]     = useState(null);
  const [globalSearching, setGlobalSearching] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [activeRow, setActiveRow]   = useState(null);
  const [viewRow, setViewRow]       = useState(null);
  const [saving, setSaving]     = useState(false);

  const gateId = isMobile ? (user?.gateId||0) : 0;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r=await getVisitors(date,gateId); setRows(r.data||[]); }
    catch { setToast({type:"error",msg:"Failed to load visitors"}); }
    finally { setLoading(false); }
  }, [date, gateId]);

  useEffect(() => { load(); }, [load]);

  // Global search with debounce
  useEffect(() => {
    if (!mobileSearch.trim()) { setGlobalRows(null); return; }
    const timer = setTimeout(async () => {
      setGlobalSearching(true);
      try { const r=await searchVisitors(mobileSearch.trim()); setGlobalRows(r.data||[]); }
      catch { setGlobalRows(null); }
      finally { setGlobalSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [mobileSearch]);

  const baseRows = globalRows !== null ? globalRows : rows;
  const statusFiltered = baseRows.filter(r => {
    if (filter==="In")    return !r.outTime;
    if (filter==="InOut") return Boolean(r.outTime);
    return true;
  });
  const searched = !isMobile && q
    ? statusFiltered.filter(r =>
        (r.name||"").toLowerCase().includes(q.toLowerCase()) ||
        String(r.mobile||"").includes(q) ||
        (r.company||"").toLowerCase().includes(q.toLowerCase()))
    : statusFiltered;
  const { sorted, sortKey, sortDir, toggle } = useSortableTable(searched, "name");

  const handleOut = async row => {
    try { await markVisitorOut(row.uid,row); setToast({type:"success",msg:"Out time saved"}); setActiveRow(null); load(); }
    catch { setToast({type:"error",msg:"Failed"}); }
  };
  const handleDelete = async uid => {
    try { await deleteVisitor(uid); setToast({type:"success",msg:"Deleted"}); load(); }
    catch { setToast({type:"error",msg:"Failed to delete"}); }
  };
  const handleDrawerSave = async form => {
    setSaving(true);
    try { await updateVisitor(activeRow.uid,form); setToast({type:"success",msg:"Saved"}); setActiveRow(null); load(); }
    catch(err){ setToast({type:"error",msg:err.response?.data?.message||"Failed"}); }
    finally { setSaving(false); }
  };

  return (
    <div style={{paddingBottom:isMobile?70:0}}>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      {/* ── Header row: compact on mobile ── */}
      <div className="page-hdr" style={isMobile?{marginBottom:6,paddingBottom:6}:{}}>
        <div className="page-hdr-left">
          <h1 style={isMobile?{fontSize:22,marginBottom:0}:{}}>Visitors</h1>
          {!isMobile && <p>{sorted.length} record{sorted.length!==1?"s":""} &bull; {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>}
        </div>
        {!isMobile && (
          <div className="page-hdr-actions">
            <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/dashboard")}><LayoutDashboard size={14}/> Dashboard</button>
            {canWrite&&<button className="btn btn-primary" onClick={()=>navigate("/visitors/new")}><Plus size={15}/> New Visitor</button>}
          </div>
        )}
      </div>

      {/* Mobile: compact toolbar — all in 2 rows */}
      {isMobile && (
        <>
          {/* Row 1: + btn | Date | Status | Refresh */}
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
            {canWrite && (
              <button className="btn btn-primary" onClick={()=>navigate("/visitors/new")}
                style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
                <Plus size={15}/> New Visitor
              </button>
            )}
            <input type="date" className="date-input" value={date}
              onChange={e=>setDate(e.target.value)}
              style={{flex:1,padding:"7px 8px",fontSize:13}}/>
            <select className="form-input" value={filter} onChange={e=>setFilter(e.target.value)}
              style={{width:76,padding:"7px 4px",fontSize:12}}>
              <option value="All">All</option>
              <option value="In">In</option>
              <option value="InOut">InOut</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={load} style={{padding:"7px 8px"}}>
              <RefreshCw size={14}/>
            </button>
          </div>
          {/* Row 2: Search */}
          <div style={{marginBottom:6,position:"relative"}}>
            <input className="form-input" placeholder="Search name, mobile or company..."
              value={mobileSearch}
              onChange={e=>setMobileSearch(e.target.value)}
              style={{paddingLeft:32,paddingRight:mobileSearch?32:12,fontSize:13,padding:"8px 12px"}}/>
            <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}/>
            {globalSearching && <span className="spin-sm" style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",borderColor:"var(--border2)",borderTopColor:"var(--accent)"}}/>}
            {mobileSearch&&!globalSearching&&(
              <button onClick={()=>{setMobileSearch("");setGlobalRows(null);}}
                style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}>
                <X size={14}/>
              </button>
            )}
          </div>
          {globalRows!==null&&(
            <div style={{fontSize:11,color:"var(--text3)",marginBottom:4,paddingLeft:2}}>
              {globalRows.length} result{globalRows.length!==1?"s":""} across all dates
            </div>
          )}
        </>
      )}

      {/* Desktop toolbar */}
      {!isMobile && (
        <div className="toolbar">
          <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)}/>
          <select className="form-input" style={{width:"auto",minWidth:90}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="In">In</option>
            <option value="InOut">InOut</option>
          </select>
          <div className="toolbar-search" style={{flex:1}}>
            <Search size={14} className="toolbar-search-icon"/>
            <input className="form-input" placeholder="Search name, mobile or company..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
        </div>
      )}

      {/* Grid */}
      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : sorted.length===0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={22}/></div>
          <h3>No visitors</h3>
          <p>{mobileSearch?"No results":filter!=="All"?`No "${filter}" visitors`:"No visitors for this date"}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile&&<th style={{width:32}}>#</th>}
              {!isMobile&&<th style={{width:40}}>Photo</th>}
              <SortableHeader label={isMobile?"Name / Mobile":"Name"} colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile&&<SortableHeader label="Company"  colKey="company"     sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile&&<SortableHeader label="Mobile"   colKey="mobile"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile&&<SortableHeader label="Type"     colKey="visitorType" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile&&<SortableHeader label="To Meet"  colKey="toMeet"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="In"  colKey="inTime"  sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Out" colKey="outTime" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {/* Actions visible on both — Eye icon on mobile */}
              <th style={{width:isMobile?36:150}}>
                {!isMobile&&"Actions"}
              </th>
            </tr></thead>
            <tbody>
              {sorted.map((row,i)=>{
                const inT  =fmtTime(row.inTime);
                const outT =fmtTime(row.outTime);
                const isOut=Boolean(row.outTime);
                return (
                  <tr key={row.uid??i}
                    style={{cursor:canUpdate?"pointer":"default"}}
                    onClick={()=>isMobile&&canUpdate&&setActiveRow(row)}
                    onMouseEnter={e=>{if(!isMobile&&canUpdate)e.currentTarget.style.background="var(--surface2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="";}}>
                    {!isMobile&&<td className="td-muted" style={{fontSize:11}}>{i+1}</td>}
                    {!isMobile&&<td><PhotoStamp row={row}/></td>}
                    <td style={{fontWeight:600}}>
                      {row.name||"—"}
                      {isMobile&&<div style={{fontSize:11,color:"var(--text3)",fontWeight:400,marginTop:1}}>{row.mobile||""}</div>}
                    </td>
                    {!isMobile&&<td style={{fontSize:12,color:"var(--text2)"}}>{row.company||"—"}</td>}
                    {!isMobile&&<td style={{fontWeight:700}}>{row.mobile||"—"}</td>}
                    {!isMobile&&<td style={{fontSize:12}}>{row.visitorType||"—"}</td>}
                    {!isMobile&&<td style={{fontSize:12}}>{row.toMeet||"—"}</td>}
                    <td style={{whiteSpace:"nowrap",padding:isMobile?"6px 4px":undefined}}>
                      {inT?<span className="badge badge-in" style={{fontSize:10,padding:"2px 6px"}}>{inT}</span>
                          :<span className="td-muted">—</span>}
                    </td>
                    <td style={{whiteSpace:"nowrap",padding:isMobile?"6px 4px":undefined}}>
                      {outT?<span className="badge badge-out" style={{fontSize:10,padding:"2px 6px"}}>{outT}</span>
                           :<span className="td-muted">—</span>}
                    </td>
                    {/* Actions — Eye always visible, others desktop only */}
                    <td onClick={e=>e.stopPropagation()} style={{padding:isMobile?"4px 2px":undefined}}>
                      {isMobile ? (
                        <button className="btn btn-ghost btn-xs"
                          onClick={()=>setViewRow(row)}
                          style={{padding:"4px 6px",minWidth:28}}>
                          <Eye size={14}/>
                        </button>
                      ) : (
                        <div style={{display:"flex",gap:3}}>
                          <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)}><Eye size={11}/> View</button>
                          {canUpdate&&<button className="btn btn-ghost btn-xs" onClick={()=>navigate(`/visitors/edit/${row.uid}`)}><Pencil size={11}/> Edit</button>}
                          {!isOut&&canUpdate&&<button className="btn btn-primary btn-xs" onClick={()=>handleOut(row)}><LogOut size={11}/> Out</button>}
                          {canDelete&&<button className="btn btn-ghost-danger btn-xs" onClick={()=>handleDelete(row.uid)}><Trash2 size={11}/></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isMobile&&activeRow&&(
        <MobileRowDrawer row={activeRow} onClose={()=>setActiveRow(null)}
          onSave={handleDrawerSave} onOut={handleOut} saving={saving}/>
      )}
      {viewRow&&<ViewDrawer row={viewRow} onClose={()=>setViewRow(null)}/>}
      {isMobile&&<BottomNav/>}
    </div>
  );
}