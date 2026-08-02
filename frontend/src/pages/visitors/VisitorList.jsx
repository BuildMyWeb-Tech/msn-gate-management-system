import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useSortableTable } from "../../hooks/useSortableTable";
import { usePagePerms } from "../../hooks/usePagePerms";
import { getVisitors, markVisitorOut, deleteVisitor } from "../../services/visitorService";
import Toast from "../../components/Toast";
import SortableHeader from "../../components/SortableHeader";
import { Plus, Search, RefreshCw, LogOut, Pencil, Users, Trash2 } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtTime = v => {
  if (!v) return null;
  try { return new Date(v).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
  catch { return v; }
};

export default function VisitorList() {
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
    try { const r = await getVisitors(date); setRows(r.data || []); }
    catch { setToast({type:"error",msg:"Failed to load visitors"}); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const filtered = q ? rows.filter(r =>
    (r.name||"").toLowerCase().includes(q.toLowerCase()) || (r.mobile||"").includes(q)
  ) : rows;
  const { sorted, sortKey, sortDir, toggle } = useSortableTable(filtered, "name");

  const handleOut = async row => {
    try { await markVisitorOut(row.uid, row); setToast({type:"success",msg:"Visitor checked out"}); load(); }
    catch { setToast({type:"error",msg:"Failed to mark out"}); }
  };
  const handleDelete = async uid => {
    try { await deleteVisitor(uid); setToast({type:"success",msg:"Visitor deleted"}); load(); }
    catch { setToast({type:"error",msg:"Failed to delete"}); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)}/>
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Visitors</h1>
          <p>{sorted.length} record{sorted.length!==1?"s":""} &bull; {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
        </div>
        <div className="page-hdr-actions">
          {canWrite && <button className="btn btn-primary" onClick={() => navigate("/visitors/new")}><Plus size={15}/> New Visitor</button>}
        </div>
      </div>

      <div className="toolbar">
        <input type="date" className="date-input" value={date} onChange={e => setDate(e.target.value)}/>
        <div className="toolbar-search">
          <Search size={14} className="toolbar-search-icon"/>
          <input className="form-input" placeholder="Search name or mobile..." value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
      </div>

      {loading ? <div className="spinner-page"><div className="spinner"/></div>
      : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={22}/></div>
          <h3>No visitors found</h3>
          <p>No visitors for {new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              {!isMobile && <th style={{width:40}}>#</th>}
              <SortableHeader label="Name"   colKey="name"        sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Mobile" colKey="mobile"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <SortableHeader label="Type"    colKey="visitorType" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile && <SortableHeader label="To Meet" colKey="toMeet"      sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              {!isMobile && <SortableHeader label="Vehicle" colKey="vehicleNo"   sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>}
              <SortableHeader label="In"  colKey="inTime"  sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              <SortableHeader label="Out" colKey="outTime" sortKey={sortKey} sortDir={sortDir} onSort={toggle}/>
              {!isMobile && <th>Status</th>}
              <th style={{width:130}}>Actions</th>
            </tr></thead>
            <tbody>
              {sorted.map((row, i) => {
                const inT  = fmtTime(row.inTime);
                const outT = fmtTime(row.outTime);
                const isOut = Boolean(row.outTime);
                return (
                  <tr key={row.uid ?? i}>
                    {!isMobile && <td className="td-muted">{i+1}</td>}
                    <td style={{fontWeight:600}}>{row.name||"—"}</td>
                    <td className="td-muted">{row.mobile||"—"}</td>
                    {!isMobile && <td>{row.visitorType||"—"}</td>}
                    {!isMobile && <td>{row.toMeet||"—"}</td>}
                    {!isMobile && <td className="td-muted">{row.vehicleNo||"—"}</td>}
                    <td>{inT  ? <span className="badge badge-in">{inT}</span>   : <span className="td-muted">—</span>}</td>
                    <td>{outT ? <span className="badge badge-out">{outT}</span> : <span className="td-muted">—</span>}</td>
                    {!isMobile && <td>{isOut ? <span className="badge badge-out">Out</span> : <span className="badge badge-in">Inside</span>}</td>}
                    <td>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {canUpdate && <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/visitors/edit/${row.uid}`)}><Pencil size={12}/> Edit</button>}
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