import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useAuth } from "../../context/AuthContext";
import { getVehicles, markVehicleOut, deleteVehicle } from "../../services/vehicleService";
import Toast from "../../components/Toast";
import { Plus, Search, RefreshCw, LogOut, Pencil, Car, Trash2, Eye, X } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtTime = v => { if(!v)return null; try{return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});}catch{return v;} };
const safeMob = v => { if(!v&&v!==0)return "—"; try{return BigInt(Math.round(Number(v))).toString();}catch{return String(v);} };

export default function VehicleList() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const [date,setDate]       = useState(today());
  const [filter,setFilter]   = useState("All");
  const [rows,setRows]       = useState([]);
  const [q,setQ]             = useState("");
  const [loading,setLoading] = useState(true);
  const [toast,setToast]     = useState(null);
  const [viewRow,setViewRow] = useState(null);
  const gateId = user?.gateId || 0;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getVehicles(date, gateId); setRows(r.data || []); }
    catch { setToast({type:"error",msg:"Failed to load vehicles"}); }
    finally { setLoading(false); }
  }, [date, gateId]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows
    .filter(r => filter==="In"?!r.outTime:filter==="InOut"?Boolean(r.outTime):true)
    .filter(r => !q||(r.vehicleNo||"").toLowerCase().includes(q.toLowerCase())||(r.name||"").toLowerCase().includes(q.toLowerCase())||safeMob(r.mobile).includes(q));

  const handleOut = async row => {
    try { await markVehicleOut(row.uid,row); setToast({type:"success",msg:"Checked out"}); load(); }
    catch { setToast({type:"error",msg:"Failed"}); }
  };

  return (
    <div style={{paddingBottom:isMobile?70:0}}>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      <div className="page-hdr">
        <div className="page-hdr-left"><h1>Vehicles</h1><p>{filtered.length} records</p></div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={()=>navigate("/vehicles/new")}><Plus size={15}/>{!isMobile?" New Vehicle":""}</button>
        </div>
      </div>
      <div className="toolbar">
        <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)}/>
        <select className="form-input" style={{width:"auto",minWidth:90}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="All">All</option><option value="In">In</option><option value="InOut">InOut</option>
        </select>
        <div className="toolbar-search" style={{flex:1}}>
          <Search size={14} className="toolbar-search-icon"/>
          <input className="form-input" placeholder="Search vehicle, name or mobile..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
      </div>
      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : filtered.length===0 ? (
        <div className="empty-state"><div className="empty-icon"><Car size={22}/></div><h3>No vehicles</h3></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile&&<th>#</th>}
              <th>Vehicle No</th>
              {!isMobile&&<th>Driver</th>}
              {!isMobile&&<th>Mobile</th>}
              {!isMobile&&<th>Type</th>}
              {!isMobile&&<th>Company</th>}
              <th>In</th><th>Out</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((row,i)=>{
                const inT=fmtTime(row.inTime),outT=fmtTime(row.outTime),isOut=Boolean(row.outTime);
                return (
                  <tr key={row.uid??i}>
                    {!isMobile&&<td className="td-muted">{i+1}</td>}
                    <td style={{fontWeight:600}}>
                      {row.vehicleNo||"—"}
                      {isMobile&&<div style={{fontSize:11,color:"var(--text3)",fontWeight:400}}>{safeMob(row.mobile)}</div>}
                    </td>
                    {!isMobile&&<td>{row.name||"—"}</td>}
                    {!isMobile&&<td style={{fontWeight:700}}>{safeMob(row.mobile)}</td>}
                    {!isMobile&&<td>{row.visitType||row.visitorType||"—"}</td>}
                    {!isMobile&&<td>{row.company||"—"}</td>}
                    <td>{inT?<span className="badge badge-in" style={{fontSize:10,padding:"2px 6px"}}>{inT}</span>:<span className="td-muted">—</span>}</td>
                    <td>{outT?<span className="badge badge-out" style={{fontSize:10,padding:"2px 6px"}}>{outT}</span>:<span className="td-muted">—</span>}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn btn-ghost btn-xs" onClick={()=>setViewRow(row)}><Eye size={11}/></button>
                        {!isMobile&&<button className="btn btn-ghost btn-xs" onClick={()=>navigate(`/vehicles/edit/${row.uid}`)}><Pencil size={11}/></button>}
                        {!isOut&&<button className="btn btn-primary btn-xs" onClick={()=>handleOut(row)}><LogOut size={11}/></button>}
                        {!isMobile&&<button className="btn btn-ghost-danger btn-xs" onClick={async()=>{try{await deleteVehicle(row.uid);setToast({type:"success",msg:"Deleted"});load();}catch{setToast({type:"error",msg:"Failed"});}}}><Trash2 size={11}/></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {viewRow&&(
        <>
          <div onClick={()=>setViewRow(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:400}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(480px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",overflowY:"auto"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700}}>Vehicle Details</div>
              <button onClick={()=>setViewRow(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={18}/></button>
            </div>
            <div style={{padding:"16px 20px"}}>
              {[["Vehicle No",viewRow.vehicleNo||"—"],["Driver",viewRow.name||"—"],["Mobile",safeMob(viewRow.mobile)],["Type",viewRow.visitType||viewRow.visitorType||"—"],["Company",viewRow.company||"—"],["To Meet",viewRow.toMeet||"—"],["In",fmtTime(viewRow.inTime)||"—"],["Out",fmtTime(viewRow.outTime)||"—"]].map(([l,v])=>(
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