import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useAuth } from "../../context/AuthContext";
import { getVehicles, markVehicleOut, deleteVehicle, updateVehicle } from "../../services/vehicleService";
import Toast from "../../components/Toast";
import BottomNav from "../../components/BottomNav";
import { Plus, Search, RefreshCw, LogOut, Pencil, Car, Trash2, Eye, X, Save } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtTime = v => { if(!v)return null; try{return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});}catch{return v;} };
const safeMob = v => { if(!v&&v!==0)return "—"; try{return BigInt(Math.round(Number(v))).toString();}catch{return String(v);} };

function hasValidPhoto(p) {
  if(!p)return false; const s=String(p).trim();
  if(!s||s.length<10||s.startsWith("/Photo/")||s.startsWith("/Vehicle/"))return false;
  return true;
}
function getPhotoSrc(p) {
  if(!hasValidPhoto(p))return null; const s=String(p).trim();
  if(s.startsWith("http")||s.startsWith("data:"))return s;
  return `data:image/jpeg;base64,${s}`;
}

// ── PhotoStamp ──────────────────────────────────────────────
function PhotoStamp({ row, size=32 }) {
  const initials=(row.vehicleNo||row.name||"V").slice(0,2).toUpperCase();
  const src=getPhotoSrc(row.photo);
  if(src) return <img src={src} alt={row.vehicleNo} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"1.5px solid var(--accent)",display:"block"}} onError={e=>e.target.style.display="none"}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid var(--border2)",flexShrink:0}}><span style={{fontSize:size*0.33,fontWeight:700,color:"var(--accent)"}}>{initials}</span></div>;
}

// ── Full screen photo viewer ────────────────────────────────
function PhotoViewer({ photo, name, onClose }) {
  const src=getPhotoSrc(photo); if(!src)return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",width:40,height:40,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"}}><X size={20}/></button>
      <img src={src} alt={name} style={{maxWidth:"90vw",maxHeight:"85dvh",borderRadius:12,objectFit:"contain"}}/>
    </div>
  );
}

// ── View Drawer ─────────────────────────────────────────────
function ViewDrawer({ row, onClose }) {
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const fmtDt = v => { if(!v)return "—"; try{return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return v;} };
  const isOut=Boolean(row.outTime);
  const hasPhoto=hasValidPhoto(row.photo);
  const photoSrc=getPhotoSrc(row.photo);
  const initials=(row.vehicleNo||"V").slice(0,2).toUpperCase();

  return (
    <>
      {showFullPhoto&&<PhotoViewer photo={row.photo} name={row.vehicleNo} onClose={()=>setShowFullPhoto(false)}/>}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(520px,92vw)",zIndex:401}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(520px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto",animation:"slideRight .25s ease"}}>
        <div style={{position:"sticky",top:0,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1}}>
          <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}><Eye size={15}/>Vehicle Details</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
        </div>
        <div style={{padding:"16px 20px"}}>
          {/* Photo + identity */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:14,background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
            <div style={{cursor:hasPhoto?"pointer":"default",flexShrink:0}} onClick={()=>hasPhoto&&setShowFullPhoto(true)}>
              {photoSrc ? (
                <img src={photoSrc} alt={row.vehicleNo} style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--accent)"}}/>
              ) : (
                <div style={{width:64,height:64,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--accent)"}}>
                  <span style={{fontSize:22,fontWeight:700,color:"var(--accent)"}}>{initials}</span>
                </div>
              )}
              {hasPhoto&&<div style={{fontSize:9,color:"var(--accent)",textAlign:"center",marginTop:2}}>Tap to zoom</div>}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{row.vehicleNo||"—"}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:1}}>{row.name||"—"} · {safeMob(row.mobile)}</div>
              <div style={{marginTop:6}}>{isOut?<span className="badge badge-out">Checked Out</span>:<span className="badge badge-in">Inside</span>}</div>
            </div>
          </div>
          {[["Type",row.visitType||row.visitorType||"—"],["Company",row.company||"—"],["To Meet",row.toMeet||"—"],["ID Type",row.idType||"—"],["ID Number",row.idNumber||"—"],["Notes",row.notes||"—"],["In Time",fmtDt(row.inTime)],["Out Time",fmtDt(row.outTime)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:11,color:"var(--text3)",fontWeight:600,textTransform:"uppercase",minWidth:100}}>{l}</span>
              <span style={{fontSize:13,color:"var(--text1)",textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Mobile Edit Drawer — notes only when out, all fields when inside ──
function MobileEditDrawer({ row, onClose, onSave, onOut, saving }) {
  const isAlreadyOut = Boolean(row.outTime);
  const [form, setForm] = useState({...row});
  const fmtDt = v => { if(!v)return "—"; try{return new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return v;} };
  const hasPhoto=hasValidPhoto(row.photo);
  const photoSrc=getPhotoSrc(row.photo);
  const [showFullPhoto,setShowFullPhoto]=useState(false);

  const onChange = e => setForm(p=>({...p,[e.target.name]:e.target.value}));

  return (
    <>
      {showFullPhoto&&<PhotoViewer photo={row.photo} name={row.vehicleNo} onClose={()=>setShowFullPhoto(false)}/>}
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400,pointerEvents:"none"}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,height:"15dvh",zIndex:401}}/>
      <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:402,background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90dvh",overflowY:"auto",animation:"slideUp .25s ease"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"8px 0 2px"}}><div style={{width:40,height:4,borderRadius:2,background:"var(--border2)"}}/></div>
        {/* Header with photo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{cursor:hasPhoto?"pointer":"default"}} onClick={()=>hasPhoto&&setShowFullPhoto(true)}>
              {photoSrc?<img src={photoSrc} alt={row.vehicleNo} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:"1.5px solid var(--accent)"}}/>
              :<div style={{width:40,height:40,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center"}}><Car size={18} style={{color:"var(--accent)"}}/></div>}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{isAlreadyOut?"Edit Record":"Edit Vehicle"}</div>
              <div style={{fontSize:11,color:"var(--text3)"}}>{row.vehicleNo}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"var(--surface2)",border:"1px solid var(--border)",width:28,height:28,borderRadius:"var(--radius-sm)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text2)"}}><X size={13}/></button>
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
                <label className="form-label">Vehicle No</label>
                <input name="vehicleNo" className="form-input" value={form.vehicleNo||""} onChange={onChange}/>
              </div>
              <div className="form-group">
                <label className="form-label">Driver Mobile</label>
                <input name="mobile" className="form-input" value={safeMob(form.mobile)||""} onChange={onChange} inputMode="numeric"/>
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input name="company" className="form-input" value={form.company||""} onChange={onChange}/>
              </div>
              <div className="form-group">
                <label className="form-label">To Meet</label>
                <input name="toMeet" className="form-input" value={form.toMeet||""} onChange={onChange}/>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input name="notes" className="form-input" value={form.notes||""} onChange={onChange} placeholder="Optional notes"/>
          </div>
        </div>

        <div style={{position:"sticky",bottom:0,background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"10px 16px 16px",display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={()=>onSave(form)} disabled={saving} style={{flex:1,padding:"11px"}}>
            {saving?<><span className="spin-sm" style={{borderColor:"rgba(0,0,0,.25)",borderTopColor:"#000"}}/>Saving...</>:<><Save size={14}/>Save</>}
          </button>
          {!isAlreadyOut&&<button className="btn btn-danger" onClick={()=>onOut(row)} style={{padding:"11px 12px",fontSize:12}}><LogOut size={13}/>Save Out Time</button>}
        </div>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────
export default function VehicleList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const [date,setDate]       = useState(today());
  const [filter,setFilter]   = useState("All");
  const [rows,setRows]       = useState([]);
  const [q,setQ]             = useState("");
  const [loading,setLoading] = useState(true);
  const [toast,setToast]     = useState(null);
  const [viewRow,setViewRow] = useState(null);
  const [activeRow,setActiveRow] = useState(null);
  const [saving,setSaving]   = useState(false);
  const gateId = user?.gateId||0;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r=await getVehicles(date,gateId); setRows(r.data||[]); }
    catch { setToast({type:"error",msg:"Failed to load vehicles"}); }
    finally { setLoading(false); }
  }, [date,gateId]);

  useEffect(()=>{load();},[load]);

  const filtered = rows
    .filter(r=>filter==="In"?!r.outTime:filter==="InOut"?Boolean(r.outTime):true)
    .filter(r=>!q||(r.vehicleNo||"").toLowerCase().includes(q.toLowerCase())||(r.name||"").toLowerCase().includes(q.toLowerCase())||safeMob(r.mobile).includes(q));

  const handleOut = async row => {
    try { await markVehicleOut(row.uid,row); setToast({type:"success",msg:"Out time saved"}); setActiveRow(null); load(); }
    catch { setToast({type:"error",msg:"Failed"}); }
  };
  const handleSave = async form => {
    setSaving(true);
    try { await updateVehicle(form.uid,form); setToast({type:"success",msg:"Updated"}); setActiveRow(null); load(); }
    catch(err){ setToast({type:"error",msg:err.response?.data?.message||"Failed"}); }
    finally{setSaving(false);}
  };
  const handleDelete = async uid => {
    try { await deleteVehicle(uid); setToast({type:"success",msg:"Deleted"}); load(); }
    catch { setToast({type:"error",msg:"Failed"}); }
  };

  return (
    <div style={{paddingBottom:isMobile?70:0}}>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      <div className="page-hdr" style={isMobile?{marginBottom:6}:{}}>
        <div className="page-hdr-left">
          <h1 style={isMobile?{fontSize:22,marginBottom:0}:{}}>Vehicles</h1>
          {!isMobile&&<p>{filtered.length} records &bull; {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>}
        </div>
        {!isMobile&&(
          <div className="page-hdr-actions">
            <button className="btn btn-primary" onClick={()=>navigate("/vehicles/new")}><Plus size={15}/> New Vehicle</button>
          </div>
        )}
      </div>

      {/* Mobile: visitor-style compact single row toolbar */}
      {isMobile&&(
        <>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
            <button className="btn btn-primary" onClick={()=>navigate("/vehicles/new")} style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
              <Plus size={15}/> New Vehicle
            </button>
            <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)} style={{flex:1,padding:"7px 8px",fontSize:13}}/>
            <select className="form-input" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:76,padding:"7px 4px",fontSize:12}}>
              <option value="All">All</option><option value="In">In</option><option value="InOut">InOut</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={load} style={{padding:"7px 8px"}}><RefreshCw size={14}/></button>
          </div>
          <div style={{marginBottom:6,position:"relative"}}>
            <input className="form-input" placeholder="Search vehicle, name or mobile..."
              value={q} onChange={e=>setQ(e.target.value)}
              style={{paddingLeft:32,fontSize:13,padding:"8px 12px"}}/>
            <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}/>
            {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}><X size={14}/></button>}
          </div>
        </>
      )}

      {/* Desktop toolbar */}
      {!isMobile&&(
        <div className="toolbar">
          <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)}/>
          <select className="form-input" style={{width:"auto",minWidth:90}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="All">All</option><option value="In">In</option><option value="InOut">InOut</option>
          </select>
          <div className="toolbar-search" style={{flex:1}}>
            <Search size={14} className="toolbar-search-icon"/>
            <input className="form-input" placeholder="Search vehicle, name or mobile..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
        </div>
      )}

      {loading?<div className="spinner-page"><div className="spinner"/></div>
      :filtered.length===0?(
        <div className="empty-state"><div className="empty-icon"><Car size={22}/></div><h3>No vehicles</h3><p>No vehicles for this date</p></div>
      ):(
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile&&<th>#</th>}
              {!isMobile&&<th>Photo</th>}
              <th>{isMobile?"Vehicle / Driver":"Vehicle No"}</th>
              {!isMobile&&<th>Driver</th>}
              {!isMobile&&<th>Mobile</th>}
              {!isMobile&&<th>Type</th>}
              {!isMobile&&<th>Company</th>}
              <th>In</th><th>Out</th>
              <th style={{width:isMobile?36:150}}></th>
            </tr></thead>
            <tbody>
              {filtered.map((row,i)=>{
                const inT=fmtTime(row.inTime),outT=fmtTime(row.outTime),isOut=Boolean(row.outTime);
                return (
                  <tr key={row.uid??i}
                    style={{cursor:isMobile?"pointer":"default"}}
                    onClick={()=>isMobile&&setActiveRow(row)}
                    onMouseEnter={e=>{if(!isMobile)e.currentTarget.style.background="var(--surface2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="";}}>
                    {!isMobile&&<td className="td-muted" style={{fontSize:11}}>{i+1}</td>}
                    {!isMobile&&<td><PhotoStamp row={row}/></td>}
                    <td style={{fontWeight:600}}>
                      {row.vehicleNo||"—"}
                      {isMobile&&<div style={{fontSize:11,color:"var(--text3)",fontWeight:400,marginTop:1}}>{safeMob(row.mobile)}</div>}
                    </td>
                    {!isMobile&&<td>{row.name||"—"}</td>}
                    {!isMobile&&<td style={{fontWeight:700}}>{safeMob(row.mobile)}</td>}
                    {!isMobile&&<td style={{fontSize:12}}>{row.visitType||row.visitorType||"—"}</td>}
                    {!isMobile&&<td style={{fontSize:12}}>{row.company||"—"}</td>}
                    <td>{inT?<span className="badge badge-in" style={{fontSize:10,padding:"2px 6px"}}>{inT}</span>:<span className="td-muted">—</span>}</td>
                    <td>{outT?<span className="badge badge-out" style={{fontSize:10,padding:"2px 6px"}}>{outT}</span>:<span className="td-muted">—</span>}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      {isMobile?(
                        <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)} style={{padding:"4px 6px"}}><Eye size={14}/></button>
                      ):(
                        <div style={{display:"flex",gap:4}}>
                          <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)}><Eye size={11}/> View</button>
                          <button className="btn btn-ghost btn-xs" onClick={()=>navigate(`/vehicles/edit/${row.uid}`)}><Pencil size={11}/> Edit</button>
                          {!isOut&&<button className="btn btn-primary btn-xs" onClick={()=>handleOut(row)}><LogOut size={11}/> Out</button>}
                          <button className="btn btn-ghost-danger btn-xs" onClick={()=>handleDelete(row.uid)}><Trash2 size={11}/></button>
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

      {isMobile&&activeRow&&<MobileEditDrawer row={activeRow} onClose={()=>setActiveRow(null)} onSave={handleSave} onOut={handleOut} saving={saving}/>}
      {viewRow&&<ViewDrawer row={viewRow} onClose={()=>setViewRow(null)}/>}
      {isMobile&&<BottomNav/>}
    </div>
  );
}