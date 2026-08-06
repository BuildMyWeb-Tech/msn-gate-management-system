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
import {
  Plus, Search, RefreshCw, LogOut, Pencil,
  Users, Trash2, LayoutDashboard, X, Save, Eye,
  Home, Car,
} from "lucide-react";

const today   = () => new Date().toISOString().split("T")[0];
const fmtTime = v => {
  if (!v) return null;
  try { return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
  catch { return v; }
};

// Validation
const isValidMobile  = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));
// #4 Aadhar digits only max 12, PAN alphanumeric max 10, #5 Others alphanumeric max 25
function validateIdProof(t, n) {
  if (!t || !n) return null;
  if (t === "Aadhar" && !/^\d{1,12}$/.test(n))         return "Aadhar: digits only, max 12";
  if (t === "PAN"    && !/^[A-Z0-9]{1,10}$/i.test(n))  return "PAN: alphanumeric, max 10";
  if (t === "Others" && !/^[A-Z0-9 ]{1,25}$/i.test(n)) return "Others: alphanumeric, max 25";
  return null;
}

const ID_TYPES    = ["Aadhar","PAN","Others"]; // #5: VoterId → Others
const VISIT_TYPES = ["Meeting","Guest","Vendor","Contractor","Delivery","Interview","Other"];

// ── PhotoStamp — outside component ───────────────────────────
function PhotoStamp({ row }) {
  const initials = (row.name||"V").slice(0,2).toUpperCase();
  if (row.photo && !row.photo.startsWith("/Photo/") && !row.photo.startsWith("/")) {
    return (
      <img src={`data:image/jpeg;base64,${row.photo}`} alt={row.name}
        style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",
          border:"1.5px solid var(--accent)",display:"block"}}/>
    );
  }
  return (
    <div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent-dim)",
      display:"flex",alignItems:"center",justifyContent:"center",
      border:"1.5px solid var(--border2)",flexShrink:0}}>
      <span style={{fontSize:11,fontWeight:700,color:"var(--accent)"}}>{initials}</span>
    </div>
  );
}

// ── ViewDrawer — outside component ───────────────────────────
function ViewDrawer({ row, onClose }) {
  const fmtDt = v => { if(!v) return "—"; try{return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return v;} };
  const isOut = Boolean(row.outTime);
  const initials = (row.name||"V").slice(0,2).toUpperCase();
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(520px,92vw)",zIndex:401}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(520px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto",animation:"slideRight .25s ease"}}>
        <div style={{position:"sticky",top:0,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:"var(--radius-sm)",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center"}}><Eye size={18} style={{color:"var(--accent)"}}/></div>
            <div><div style={{fontWeight:700,fontSize:15}}>Visitor Details</div><div style={{fontSize:11,color:"var(--text3)"}}>Full record view</div></div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"var(--radius-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={16}/></button>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:16,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
            {(row.photo&&!row.photo.startsWith("/"))?(
              <img src={`data:image/jpeg;base64,${row.photo}`} alt={row.name} style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"2px solid var(--accent)"}}/>
            ):(
              <div style={{width:72,height:72,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid var(--accent)"}}>
                <span style={{fontSize:24,fontWeight:700,color:"var(--accent)"}}>{initials}</span>
              </div>
            )}
            <div>
              <div style={{fontWeight:700,fontSize:18}}>{row.name||"—"}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{row.mobile||"—"}</div>
              <div style={{marginTop:6}}>{isOut?<span className="badge badge-out">Checked Out</span>:<span className="badge badge-in">Inside</span>}</div>
            </div>
          </div>
          {[["Visitor Type",row.visitorType||"—"],["Company",row.company||"—"],["To Meet",row.toMeet||"—"],["Vehicle No",row.vehicleNo||"—"],["ID Type",row.idType||"—"],["ID Number",row.idNumber||"—"],["Visitor Count",row.visitorCount||1],["Notes",row.notes||"—"],["In Time",fmtDt(row.inTime)],["Out Time",fmtDt(row.outTime)]].map(([label,val])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:12,color:"var(--text3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",minWidth:120}}>{label}</span>
              <span style={{fontSize:14,color:"var(--text1)",textAlign:"right"}}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── MobileRowDrawer — outside component ──────────────────────
// #2,3: photo view-only, if out time exists lock all except Notes
// #4,5: ID field constraints
// #7: validation error in modal with OK + focus
function MobileRowDrawer({ row, onClose, onSave, onOut, saving }) {
  const isAlreadyOut = Boolean(row.outTime);
  const [form, setForm]     = useState({...row});
  const [errors, setErrors] = useState({});
  const [idAlert, setIdAlert] = useState(""); // #7: modal alert

  const onChange = e => {
    let {name, value} = e.target;
    // #4: Aadhar digits only, PAN uppercase alphanumeric
    if (name === "idNumber") {
      if (form.idType === "Aadhar") value = value.replace(/\D/g,"").slice(0,12);
      if (form.idType === "PAN")    value = value.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,10);
      if (form.idType === "Others") value = value.replace(/[^A-Za-z0-9 ]/g,"").slice(0,25);
    }
    if (name === "idType") {
      setForm(p => ({...p, idType:value, idNumber:""})); return;
    }
    setForm(p => ({...p, [name]:value}));
    if (errors[name]) setErrors(p => ({...p,[name]:""}));
  };

  const validate = () => {
    const e = {};
    if (!isAlreadyOut) {
      if (!form.name.trim())   e.name = "Required";
      if (!form.mobile.trim()) e.mobile = "Required";
      if (!isValidMobile(form.mobile)) e.mobile = "Valid 10-digit mobile";
      const idErr = validateIdProof(form.idType, form.idNumber);
      if (idErr) { setIdAlert(idErr); return null; } // #7: show modal
    }
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (errs === null) return; // #7: modal shown
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  };

  const fmtDt = v => { if(!v) return "—"; try{return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return v;} };

  return (
    <>
      {/* #7: ID validation modal */}
      {idAlert && (
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)"}}>
          <div style={{background:"var(--surface)",borderRadius:"var(--radius-sm)",padding:24,maxWidth:280,width:"90%",border:"1px solid var(--border)"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>ID Validation Error</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:20}}>{idAlert}</div>
            <button className="btn btn-primary" style={{width:"100%"}}
              onClick={() => { setIdAlert(""); document.querySelector('[name="idNumber"]')?.focus(); }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,height:"15dvh",zIndex:401}}/>
      <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:402,background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90dvh",overflowY:"auto",animation:"slideUp .25s ease",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"var(--border2)"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px 12px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
            <Pencil size={15} style={{color:"var(--accent)"}}/>
            {isAlreadyOut ? "Edit Record" : "Edit Visitor"}
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"var(--radius-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={14}/></button>
        </div>

        <div style={{padding:"14px 20px"}}>
          {/* #2: Photo view-only */}
          {row.photo && !row.photo.startsWith("/") && (
            <div style={{marginBottom:14,textAlign:"center"}}>
              <img src={`data:image/jpeg;base64,${row.photo}`} alt={row.name}
                style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--accent)"}}/>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>Photo (view only)</div>
            </div>
          )}

          {/* #3: If already out — show out time, lock all except Notes */}
          {isAlreadyOut && (
            <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"10px 14px",marginBottom:14}}>
              <div style={{fontSize:11,color:"var(--text3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Out Time</div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--accent)"}}>{fmtDt(row.outTime)}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>All fields locked. Only Notes can be updated.</div>
            </div>
          )}

          {/* Fields — locked if already out, except Notes */}
          {!isAlreadyOut && (
            <>
              <div className="form-group">
                <label className="form-label">Mobile <span className="req">*</span></label>
                <input name="mobile" className={`form-input ${errors.mobile?"err":""}`}
                  value={form.mobile} onChange={onChange} inputMode="numeric"/>
                {errors.mobile&&<div className="form-error">{errors.mobile}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Name <span className="req">*</span></label>
                <input name="name" className={`form-input ${errors.name?"err":""}`}
                  value={form.name} onChange={onChange}/>
                {errors.name&&<div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ID Type</label>
                  <select name="idType" className="form-input" value={form.idType||""} onChange={onChange}>
                    <option value="">— ID Type —</option>
                    {ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number</label>
                  <input name="idNumber" className="form-input" value={form.idNumber||""} onChange={onChange}
                    inputMode={form.idType==="Aadhar"?"numeric":"text"}
                    placeholder={form.idType==="Aadhar"?"12 digits":form.idType==="PAN"?"10 chars":"25 chars max"}/>
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

          {/* Notes — always editable */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input name="notes" className="form-input" value={form.notes||""} onChange={onChange} placeholder="Optional notes"/>
          </div>
        </div>

        <div style={{position:"sticky",bottom:0,background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"12px 20px 20px",display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{flex:1,padding:"11px"}}>
            {saving?<><span className="spin-sm" style={{borderColor:"rgba(0,0,0,.25)",borderTopColor:"#000"}}/>Saving...</>:<><Save size={15}/>Save</>}
          </button>
          {/* #2: Button label "Save Out Time" when not yet out */}
          {!isAlreadyOut && (
            <button className="btn btn-danger" onClick={()=>onOut(row)} style={{padding:"11px 12px",fontSize:13}}>
              <LogOut size={14}/>Save Out Time
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Bottom nav bar — outside component ───────────────────────
// #10: Mobile bottom nav
function BottomNav({ navigate, currentPath }) {
  const items = [
    { path:"/dashboard", label:"Dashboard", Icon:Home },
    { path:"/visitors",  label:"Visitors",  Icon:Users },
    { path:"/vehicles",  label:"Vehicles",  Icon:Car  },
  ];
  return (
    <div style={{
      position:"fixed",bottom:0,left:0,right:0,
      background:"var(--surface)",borderTop:"1px solid var(--border)",
      display:"flex",zIndex:300,
      paddingBottom:"env(safe-area-inset-bottom,0px)",
    }}>
      {items.map(({path,label,Icon}) => {
        const active = currentPath.startsWith(path);
        return (
          <button key={path} onClick={()=>navigate(path)}
            style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              color:active?"var(--accent)":"var(--text3)",
              transition:"color .15s",
            }}>
            <Icon size={20}/>
            <span style={{fontSize:10,fontWeight:active?700:500}}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function VisitorList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const { canWrite, canUpdate, canDelete } = usePagePerms();
  const { user } = useAuth();

  const [date, setDate]       = useState(today());
  const [filter, setFilter]   = useState("All");
  const [rows, setRows]       = useState([]);
  const [q, setQ]             = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [saving, setSaving]   = useState(false);

  const gateId = isMobile ? (user?.gateId||0) : 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getVisitors(date, gateId);
      setRows(r.data||[]);
    } catch { setToast({type:"error",msg:"Failed to load visitors"}); }
    finally { setLoading(false); }
  }, [date, gateId]);

  useEffect(() => { load(); }, [load]);

  // #8: Mobile search — calls PR_Search_Visitors for global search (not date-limited)
  const [globalRows, setGlobalRows] = useState(null); // null = use date rows
  const [globalSearching, setGlobalSearching] = useState(false);

  useEffect(() => {
    if (!mobileSearch.trim()) { setGlobalRows(null); return; }
    const timer = setTimeout(async () => {
      setGlobalSearching(true);
      try {
        const r = await searchVisitors(mobileSearch.trim());
        setGlobalRows(r.data || []);
      } catch { setGlobalRows(null); }
      finally { setGlobalSearching(false); }
    }, 400); // debounce 400ms
    return () => clearTimeout(timer);
  }, [mobileSearch]);

  const mobileFiltered = globalRows !== null ? globalRows : rows;

  const statusFiltered = mobileFiltered.filter(r => {
    if (filter==="In")    return !r.outTime;
    if (filter==="InOut") return Boolean(r.outTime);
    return true;
  });

  // Desktop: filter by q (name/mobile/company)
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
    <div style={{paddingBottom: isMobile ? 64 : 0}}>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Visitors</h1>
          <p>{sorted.length} record{sorted.length!==1?"s":""} &bull; {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
        </div>
        <div className="page-hdr-actions">
          {!isMobile && <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/dashboard")}><LayoutDashboard size={14}/> Dashboard</button>}
          {canWrite && <button className="btn btn-primary" onClick={()=>navigate("/visitors/new")}><Plus size={15}/>{!isMobile?" New Visitor":""}</button>}
        </div>
      </div>

      {/* #8: Mobile search — calls PR_Search_Visitors globally */}
      {isMobile && (
        <div style={{marginBottom:8}}>
          <div className="input-group">
            <input className="form-input" placeholder="Search name, mobile or company..."
              value={mobileSearch}
              onChange={e=>setMobileSearch(e.target.value)}/>
            {globalSearching && <span className="spin-sm" style={{margin:"0 8px",borderColor:"var(--border2)",borderTopColor:"var(--accent)"}}/>}
            {mobileSearch && !globalSearching && (
              <button className="btn btn-ghost" onClick={()=>{setMobileSearch("");setGlobalRows(null);}}><X size={14}/></button>
            )}
          </div>
          {globalRows !== null && (
            <div style={{fontSize:11,color:"var(--text3)",marginTop:4,paddingLeft:4}}>
              {globalRows.length} result{globalRows.length!==1?"s":""} across all dates
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)}/>
        <select className="form-input" style={{width:"auto",minWidth:90}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="In">In</option>
          <option value="InOut">InOut</option>
        </select>
        {!isMobile && (
          <div className="toolbar-search" style={{flex:1}}>
            <Search size={14} className="toolbar-search-icon"/>
            <input className="form-input" placeholder="Search name, mobile or company..."
              value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/>{!isMobile&&" Refresh"}</button>
      </div>

      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : sorted.length===0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={22}/></div>
          <h3>No visitors</h3>
          <p>{mobileSearch?"No results for your search":filter!=="All"?`No "${filter}" visitors`:"No visitors for this date"}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile && <th style={{width:36}}>#</th>}
              {!isMobile && <th style={{width:44}}>Photo</th>}
              {/* Name column — on mobile shows name + mobile subtitle */}
              <SortableHeader label="Name / Mobile" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <SortableHeader label="Company"  colKey="company"     sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile && <SortableHeader label="Mobile"   colKey="mobile"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile && <SortableHeader label="Type"     colKey="visitorType" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile && <SortableHeader label="To Meet"  colKey="toMeet"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="In"  colKey="inTime"  sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Out" colKey="outTime" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <th style={{width:isMobile?40:150}}>{isMobile?"":"Actions"}</th>
            </tr></thead>
            <tbody>
              {sorted.map((row,i)=>{
                const inT   = fmtTime(row.inTime);
                const outT  = fmtTime(row.outTime);
                const isOut = Boolean(row.outTime);
                return (
                  <tr key={row.uid??i}
                    style={{cursor:canUpdate?"pointer":"default"}}
                    onClick={()=>isMobile&&canUpdate&&setActiveRow(row)}
                    onMouseEnter={e=>{if(!isMobile&&canUpdate)e.currentTarget.style.background="var(--surface2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="";}}>
                    {!isMobile && <td className="td-muted" style={{fontSize:11}}>{i+1}</td>}
                    {!isMobile && <td><PhotoStamp row={row}/></td>}
                    {/* Mobile: Name + mobile subtitle in ONE cell */}
                    <td style={{fontWeight:600}}>
                      {row.name||"—"}
                      {isMobile && (
                        <div style={{fontSize:11,color:"var(--text3)",fontWeight:400,marginTop:2}}>
                          {row.mobile||""} 
                        </div>
                      )}
                    </td>
                    {!isMobile && <td style={{fontSize:12,color:"var(--text2)"}}>{row.company||"—"}</td>}
                    {/* Mobile: no separate mobile column — shown as subtitle above */}
                    {!isMobile && <td style={{fontWeight:700}}>{row.mobile||"—"}</td>}
                    {!isMobile && <td style={{fontSize:12}}>{row.visitorType||"—"}</td>}
                    {!isMobile && <td style={{fontSize:12}}>{row.toMeet||"—"}</td>}
                    <td style={{whiteSpace:"nowrap"}}>
                      {inT?<span className="badge badge-in" style={{fontSize:11,padding:"2px 7px"}}>{inT}</span>:<span className="td-muted">—</span>}
                    </td>
                    <td style={{whiteSpace:"nowrap"}}>
                      {outT?<span className="badge badge-out" style={{fontSize:11,padding:"2px 7px"}}>{outT}</span>:<span className="td-muted">—</span>}
                    </td>
                    <td onClick={e=>e.stopPropagation()}>
                      {isMobile ? (
                        <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)} style={{padding:"4px 8px"}}>
                          <Eye size={14}/>
                        </button>
                      ) : (
                        <div style={{display:"flex",gap:4}}>
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

      {/* #10: Bottom nav bar — mobile only */}
      {isMobile && <BottomNav navigate={navigate} currentPath={location.pathname}/>}
    </div>
  );
}