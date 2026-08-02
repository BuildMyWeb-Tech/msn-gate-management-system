import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useSortableTable } from "../../hooks/useSortableTable";
import { usePagePerms } from "../../hooks/usePagePerms";
import { getVehicles, markVehicleOut, deleteVehicle } from "../../services/vehicleService";
import Toast from "../../components/Toast";
import SortableHeader from "../../components/SortableHeader";
import { Plus, Search, RefreshCw, LogOut, Pencil, Car, Trash2 } from "lucide-react";

const today   = () => new Date().toISOString().split("T")[0];
const fmtTime = v => {
  if (!v) return null;
  try { return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
  catch { return v; }
};

export default function VehicleList() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { canWrite, canUpdate, canDelete } = usePagePerms();
  const [date, setDate]     = useState(today());
  const [rows, setRows]     = useState([]);
  const [q, setQ]           = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getVehicles(date); setRows(r.data || []); }
    catch { setToast({type:"error",msg:"Failed to load vehicles"}); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const filtered = q ? rows.filter(r =>
    (r.vehicleNo||"").toLowerCase().includes(q.toLowerCase()) ||
    (r.name||"").toLowerCase().includes(q.toLowerCase()) ||
    (r.mobile||"").includes(q)
  ) : rows;
  const { sorted, sortKey, sortDir, toggle } = useSortableTable(filtered, "vehicleNo");

  const handleOut = async row => {
    try { await markVehicleOut(row.uid, row); setToast({type:"success",msg:"Vehicle checked out"}); load(); }
    catch { setToast({type:"error",msg:"Failed to mark out"}); }
  };
  const handleDelete = async uid => {
    try { await deleteVehicle(uid); setToast({type:"success",msg:"Vehicle deleted"}); load(); }
    catch { setToast({type:"error",msg:"Failed to delete"}); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)}/>
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Vehicles</h1>
          <p>{sorted.length} record{sorted.length!==1?"s":""} &bull; {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
        </div>
        <div className="page-hdr-actions">
          {canWrite && <button className="btn btn-primary" onClick={() => navigate("/vehicles/new")}><Plus size={15}/> New Vehicle</button>}
        </div>
      </div>

      <div className="toolbar">
        <input type="date" className="date-input" value={date} onChange={e => setDate(e.target.value)}/>
        <div className="toolbar-search">
          <Search size={14} className="toolbar-search-icon"/>
          <input className="form-input" placeholder="Search vehicle, name or mobile..." value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
      </div>

      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Car size={22}/></div>
          <h3>No vehicles found</h3>
          <p>No vehicles for {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile && <th style={{width:40}}>#</th>}
              <SortableHeader label="Vehicle No" colKey="vehicleNo" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <SortableHeader label="Driver"   colKey="name"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="Mobile"    colKey="mobile"    sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <SortableHeader label="Type"    colKey="visitType"  sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile && <SortableHeader label="Company" colKey="company"    sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="In"  colKey="inTime"  sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Out" colKey="outTime" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <th>Status</th>}
              <th style={{width:130}}>Actions</th>
            </tr></thead>
            <tbody>
              {sorted.map((row, i) => {
                const inT   = fmtTime(row.inTime);
                const outT  = fmtTime(row.outTime);
                const isOut = Boolean(row.outTime);
                return (
                  <tr key={row.uid ?? i}>
                    {!isMobile && <td className="td-muted">{i+1}</td>}
                    <td style={{fontWeight:600}}>{row.vehicleNo||"—"}</td>
                    {!isMobile && <td>{row.name||"—"}</td>}
                    <td className="td-muted">{row.mobile||"—"}</td>
                    {!isMobile && <td>{row.visitType||"—"}</td>}
                    {!isMobile && <td>{row.company||"—"}</td>}
                    <td>{inT  ? <span className="badge badge-in">{inT}</span>   : <span className="td-muted">—</span>}</td>
                    <td>{outT ? <span className="badge badge-out">{outT}</span> : <span className="td-muted">—</span>}</td>
                    {!isMobile && <td>{isOut ? <span className="badge badge-out">Out</span> : <span className="badge badge-in">Inside</span>}</td>}
                    <td>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {canUpdate && <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/vehicles/edit/${row.uid}`)}><Pencil size={12}/> Edit</button>}
                        {!isOut && canUpdate && <button className="btn btn-primary btn-xs" onClick={() => handleOut(row)}><LogOut size={12}/> Out</button>}
                        {canDelete && <button className="btn btn-ghost-danger btn-xs" onClick={() => handleDelete(row.uid)}><Trash2 size={12}/></button>}
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