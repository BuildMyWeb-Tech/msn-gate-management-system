import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { getVehicles, markVehicleOut } from "../../services/vehicleService";
import Toast from "../../components/Toast";
import { Plus, Search, RefreshCw, LogOut, Pencil, Car } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtTime = v => { if (!v) return null; try { return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); } catch { return v; } };

export default function VehicleList() {
  const navigate  = useNavigate();
  const { isMobile } = useResponsive();
  const [date, setDate]   = useState(today());
  const [rows, setRows]   = useState([]);
  const [q, setQ]         = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getVehicles(date); setRows(r.data||[]); }
    catch { setToast({type:"error",msg:"Failed to load vehicles"}); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const filtered = q ? rows.filter(r => (r.VehicleNo||r.vehicleNo||"").toLowerCase().includes(q.toLowerCase()) || (r.Mobile||r.mobile||"").includes(q)) : rows;

  const handleOut = async row => {
    try { await markVehicleOut(row.Uid||row.uid); setToast({type:"success",msg:"Vehicle checked out"}); load(); }
    catch { setToast({type:"error",msg:"Failed to mark out"}); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)} />
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Vehicles</h1>
          <p>{filtered.length} record{filtered.length!==1?"s":""} • {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-primary" onClick={()=>navigate("/vehicles/new")}><Plus size={15}/>New Vehicle</button>
        </div>
      </div>

      <div className="toolbar">
        <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)} />
        <div className="toolbar-search">
          <Search size={14} className="toolbar-search-icon" />
          <input className="form-input" placeholder="Search vehicle no or mobile..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/>Refresh</button>
      </div>

      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Car size={22}/></div>
          <h3>No vehicles found</h3>
          <p>No vehicles recorded for {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile&&<th style={{width:40}}>#</th>}
              {!isMobile&&<th>Pass No</th>}
              <th>Vehicle No</th>
              <th>Mobile</th>
              {!isMobile&&<th>Driver</th>}
              {!isMobile&&<th>Type</th>}
              <th>WH</th>
              <th>In Time</th>
              <th>Out Time</th>
              {!isMobile&&<th>Status</th>}
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((row,i)=>{
                const uid=row.Uid||row.uid;
                const inT=fmtTime(row.InTime||row.inTime);
                const outT=fmtTime(row.OutTime||row.outTime);
                const isOut=Boolean(row.OutTime||row.outTime);
                return (
                  <tr key={uid||i}>
                    {!isMobile&&<td className="td-muted">{i+1}</td>}
                    {!isMobile&&<td><span className="badge-pass">{row.PassNo||row.passNo||"—"}</span></td>}
                    <td style={{fontWeight:600}}>{row.VehicleNo||row.vehicleNo||"—"}</td>
                    <td className="td-muted">{row.Mobile||row.mobile||"—"}</td>
                    {!isMobile&&<td>{row.Name||row.name||"—"}</td>}
                    {!isMobile&&<td>{row.VisitType||row.visitType||"—"}</td>}
                    <td>{row.Warehouse||row.warehouse||"—"}</td>
                    <td>{inT?<span className="badge badge-in">{inT}</span>:<span className="td-muted">—</span>}</td>
                    <td>{outT?<span className="badge badge-out">{outT}</span>:<span className="td-muted">—</span>}</td>
                    {!isMobile&&<td>{isOut?<span className="badge badge-out">Out</span>:<span className="badge badge-in">Inside</span>}</td>}
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-ghost btn-xs" onClick={()=>navigate(`/vehicles/edit/${uid}`)}><Pencil size={12}/>Edit</button>
                        {!isOut&&<button className="btn btn-primary btn-xs" onClick={()=>handleOut(row)}><LogOut size={12}/>Out</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
