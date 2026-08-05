import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useSortableTable } from "../../hooks/useSortableTable";
import { usePagePerms } from "../../hooks/usePagePerms";
import { useAuth } from "../../context/AuthContext";
import {
  getVisitors, markVisitorOut, deleteVisitor, updateVisitor,
} from "../../services/visitorService";
import Toast from "../../components/Toast";
import SortableHeader from "../../components/SortableHeader";
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
const isValidMobile  = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g,""));
const isValidAadhar  = v => /^\d{12}$/.test(String(v).replace(/\s/g,""));
const isValidPAN     = v => /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(String(v));
const isValidVoterId = v => String(v).trim().length >= 8;

function validateIdProof(t,n){
  if(!t||!n) return null;
  if(t==="Aadhar"&&!isValidAadhar(n))  return "Aadhar: 12 digits";
  if(t==="PAN"&&!isValidPAN(n))        return "PAN format: ABCDE1234F";
  if(t==="VoterId"&&!isValidVoterId(n)) return "VoterId: min 8 chars";
  return null;
}

const ID_TYPES    = ["Aadhar","PAN","VoterId"];
const VISIT_TYPES = ["Meeting","Guest","Vendor","Contractor","Delivery","Interview","Other"];

// ── PhotoStamp — OUTSIDE component, no remount ────────────────
function PhotoStamp({ row }) {
  const initials = (row.name || "V").slice(0,2).toUpperCase();
  if (row.photo && !row.photo.startsWith("/Photo/")) {
    return (
      <img
        src={`data:image/jpeg;base64,${row.photo}`}
        alt={row.name}
        style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover",
          border:"1.5px solid var(--accent)",display:"block" }}
      />
    );
  }
  return (
    <div style={{
      width:32,height:32,borderRadius:"50%",
      background:"var(--accent-dim)",
      display:"flex",alignItems:"center",justifyContent:"center",
      border:"1.5px solid var(--border2)",flexShrink:0,
    }}>
      <span style={{ fontSize:11,fontWeight:700,color:"var(--accent)" }}>{initials}</span>
    </div>
  );
}

// ── ViewDrawer — OUTSIDE component ───────────────────────────
function ViewDrawer({ row, onClose }) {
  const fmtDt = v => {
    if(!v) return "—";
    try { return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
    catch { return v; }
  };
  const isOut    = Boolean(row.outTime);
  const initials = (row.name||"V").slice(0,2).toUpperCase();
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(520px,92vw)",zIndex:401}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(520px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto",animation:"slideRight .25s ease"}}>
        <div style={{position:"sticky",top:0,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:"var(--radius-sm)",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Eye size={18} style={{color:"var(--accent)"}}/>
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Visitor Details</div>
              <div style={{fontSize:11,color:"var(--text3)"}}>Full record view</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"var(--radius-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={16}/></button>
        </div>
        <div style={{padding:"20px 24px"}}>
          {/* Photo + identity */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:16,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
            {(row.photo && !row.photo.startsWith("/Photo/")) ? (
              <img src={`data:image/jpeg;base64,${row.photo}`} alt={row.name}
                style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"2px solid var(--accent)"}}/>
            ) : (
              <div style={{width:72,height:72,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid var(--accent)"}}>
                <span style={{fontSize:24,fontWeight:700,color:"var(--accent)"}}>{initials}</span>
              </div>
            )}
            <div>
              <div style={{fontWeight:700,fontSize:18}}>{row.name||"—"}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{row.mobile||"—"}</div>
              <div style={{marginTop:6}}>
                {isOut ? <span className="badge badge-out">Checked Out</span>
                       : <span className="badge badge-in">Inside</span>}
              </div>
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
          ].map(([label,val]) => (
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

// ── MobileRowDrawer — OUTSIDE component ──────────────────────
function MobileRowDrawer({ row, onClose, onSave, onOut, saving }) {
  const [form,setForm]     = useState({...row});
  const [errors,setErrors] = useState({});
  const onChange = e => {
    const{name,value}=e.target;
    setForm(p=>({...p,[name]:value}));
    if(errors[name]) setErrors(p=>({...p,[name]:""}));
  };
  const validate = () => {
    const e={};
    if(!form.name.trim())   e.name="Required";
    if(!form.mobile.trim()) e.mobile="Required";
    if(!isValidMobile(form.mobile)) e.mobile="Valid 10-digit mobile";
    const idErr=validateIdProof(form.idType,form.idNumber);
    if(idErr) e.idNumber=idErr;
    return e;
  };
  const handleSave=()=>{ const errs=validate(); if(Object.keys(errs).length){setErrors(errs);return;} onSave(form); };
  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,height:"15dvh",zIndex:401}}/>
      <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:402,background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"85dvh",overflowY:"auto",animation:"slideUp .25s ease",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"var(--border2)"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px 12px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}><Pencil size={15} style={{color:"var(--accent)"}}/>Edit Visitor</div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"var(--radius-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={14}/></button>
        </div>
        <div style={{padding:"14px 20px"}}>
          <div className="form-group">
            <label className="form-label">Mobile <span className="req">*</span></label>
            <input name="mobile" className={`form-input ${errors.mobile?"err":""}`} value={form.mobile} onChange={onChange} inputMode="numeric" placeholder="10-digit mobile"/>
            {errors.mobile&&<div className="form-error">{errors.mobile}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Name <span className="req">*</span></label>
            <input name="name" className={`form-input ${errors.name?"err":""}`} value={form.name} onChange={onChange} placeholder="Full name"/>
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
              <input name="idNumber" className={`form-input ${errors.idNumber?"err":""}`} value={form.idNumber||""} onChange={onChange} placeholder="ID number"/>
              {errors.idNumber&&<div className="form-error">{errors.idNumber}</div>}
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
        </div>
        <div style={{position:"sticky",bottom:0,background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"12px 20px 20px",display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{flex:1,padding:"11px"}}>
            {saving?<><span className="spin-sm" style={{borderColor:"rgba(0,0,0,.25)",borderTopColor:"#000"}}/>Saving...</>:<><Save size={15}/>Save</>}
          </button>
          {!row.outTime&&<button className="btn btn-danger" onClick={()=>onOut(row)} style={{padding:"11px 16px"}}><LogOut size={15}/>Out</button>}
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────
export default function VisitorList() {
  const navigate = useNavigate();
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

  // Auto-search on mobile when 10 digits typed
  useEffect(() => {
    if (mobileSearch.length === 10) {
      if (isValidMobile(mobileSearch)) {
        setQ(mobileSearch);
      }
    } else if (mobileSearch.length === 0) {
      setQ("");
    }
  }, [mobileSearch]);

  const statusFiltered = rows.filter(r => {
    if (filter==="In")    return !r.outTime;
    if (filter==="InOut") return Boolean(r.outTime);
    return true;
  });
  const searched = q
    ? statusFiltered.filter(r =>
        (r.name||"").toLowerCase().includes(q.toLowerCase()) ||
        String(r.mobile||"").includes(q))
    : statusFiltered;
  const { sorted, sortKey, sortDir, toggle } = useSortableTable(searched, "name");

  const handleOut = async row => {
    try { await markVisitorOut(row.uid,row); setToast({type:"success",msg:"Visitor checked out"}); setActiveRow(null); load(); }
    catch { setToast({type:"error",msg:"Failed to mark out"}); }
  };
  const handleDelete = async uid => {
    try { await deleteVisitor(uid); setToast({type:"success",msg:"Deleted"}); load(); }
    catch { setToast({type:"error",msg:"Failed to delete"}); }
  };
  const handleDrawerSave = async form => {
    setSaving(true);
    try { await updateVisitor(activeRow.uid,form); setToast({type:"success",msg:"Visitor updated"}); setActiveRow(null); load(); }
    catch(err){ setToast({type:"error",msg:err.response?.data?.message||"Failed to save"}); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Visitors</h1>
          <p>{sorted.length} record{sorted.length!==1?"s":""} &bull; {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/dashboard")}>
            <LayoutDashboard size={14}/>{!isMobile&&" Dashboard"}
          </button>
          {canWrite&&<button className="btn btn-primary" onClick={()=>navigate("/visitors/new")}><Plus size={15}/>{!isMobile?" New Visitor":""}</button>}
        </div>
      </div>

      {/* Mobile: mobile search — auto-searches at 10 digits */}
      {isMobile && (
        <div style={{marginBottom:8}}>
          <div className="input-group">
            <input className="form-input" placeholder="Type mobile to search..."
              value={mobileSearch}
              onChange={e=>setMobileSearch(e.target.value.replace(/\D/g,""))}
              inputMode="numeric" maxLength={10}/>
            <button className="btn btn-ghost" onClick={()=>{ if(mobileSearch) setQ(mobileSearch); }}><Search size={14}/></button>
          </div>
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
        <div className="toolbar-search" style={{flex:1}}>
          <Search size={14} className="toolbar-search-icon"/>
          <input className="form-input" placeholder="Search name or mobile..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/>{!isMobile&&" Refresh"}</button>
      </div>

      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : sorted.length===0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={22}/></div>
          <h3>No visitors</h3>
          <p>{filter!=="All"?`No "${filter}" visitors`:"No visitors for this date"}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{width:36}}>#</th>
              <th style={{width:44}}>Photo</th>
              <SortableHeader label="Name"   colKey="name"        sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile&&<SortableHeader label="Company" colKey="company"     sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="Mobile"  colKey="mobile"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile&&<SortableHeader label="Type"    colKey="visitorType" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile&&<SortableHeader label="To Meet" colKey="toMeet"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="In"  colKey="inTime"  sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Out" colKey="outTime" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <th style={{width:isMobile?50:150}}>Actions</th>
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
                    <td className="td-muted" style={{fontSize:11}}>{i+1}</td>
                    <td><PhotoStamp row={row}/></td>
                    <td style={{fontWeight:600}}>{row.name||"—"}</td>
                    {!isMobile&&<td style={{fontSize:12,color:"var(--text2)"}}>{row.company||"—"}</td>}
                    <td style={{fontWeight:700}}>{row.mobile||"—"}</td>
                    {!isMobile&&<td style={{fontSize:12}}>{row.visitorType||"—"}</td>}
                    {!isMobile&&<td style={{fontSize:12}}>{row.toMeet||"—"}</td>}
                    <td style={{whiteSpace:"nowrap"}}>
                      {inT?<span className="badge badge-in" style={{fontSize:11,padding:"2px 7px"}}>{inT}</span>
                          :<span className="td-muted">—</span>}
                    </td>
                    <td style={{whiteSpace:"nowrap"}}>
                      {outT?<span className="badge badge-out" style={{fontSize:11,padding:"2px 7px"}}>{outT}</span>
                           :<span className="td-muted">—</span>}
                    </td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)}>
                          <Eye size={11}/>{!isMobile&&" View"}
                        </button>
                        {!isMobile&&canUpdate&&<button className="btn btn-ghost btn-xs" onClick={()=>navigate(`/visitors/edit/${row.uid}`)}><Pencil size={11}/> Edit</button>}
                        {!isMobile&&!isOut&&canUpdate&&<button className="btn btn-primary btn-xs" onClick={()=>handleOut(row)}><LogOut size={11}/> Out</button>}
                        {!isMobile&&canDelete&&<button className="btn btn-ghost-danger btn-xs" onClick={()=>handleDelete(row.uid)}><Trash2 size={11}/></button>}
                      </div>
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
    </div>
  );
}