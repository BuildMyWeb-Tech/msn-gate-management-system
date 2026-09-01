import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { Plus, Pencil, Trash2, RefreshCw, Shield, X, Save, ChevronUp, ChevronDown } from "lucide-react";

// ── Normalise grid row ───────────────────────────────────────
function normaliseGrid(r) {
  return {
    uid:          Number(r.uid       ?? r.Uid       ?? r.PlanMUid ?? 0),
    planName:     r.PlanName ?? r.planname ?? r.planName ?? "",
    patrolPoints: Number(r.PatrolPoints ?? r.patrolpoints ?? 0),
    duration:     r.Duration ?? r.duration ?? "—",
  };
}

// ── Normalise detail row ─────────────────────────────────────
function normaliseDetail(r) {
  return {
    uid:              Number(r.uid ?? r.Uid ?? r.UId ?? 0),
    planOrder:        Number(r.planorder ?? r.PlanOrder ?? 0),
    patrolPointUid:   Number(r.patrolpointuid ?? r.PatrolPointUid ?? 0),
    // SP PR_Get_PatrolPlanList returns column "patrolpoints" (lowercase)
    patrolPointName:  r.patrolpoints ?? r.PatrolPoints ?? r.PatrolPointName ?? r.patrolpointname ?? "",
    leadTime:         Number(r.leadtime ?? r.LeadTime ?? 0),
    duration:         r.Duration ?? r.duration ?? "",
  };
}

// ── Filter + normalise detail rows (handles "No Data Found" SP response) ───
function filterAndNormalise(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter(row => {
      const msg  = String(row.ResponseMessage ?? "").toLowerCase();
      const code = row.ResponseCode ?? 100;
      // Skip "No Data Found" placeholder rows
      if (msg.includes("no data") || msg.includes("not found")) return false;
      // Skip rows with no patrol point uid (empty/invalid rows)
      const hasPoint = row.patrolpointuid || row.PatrolPointUid || row.patrolpoints || row.PatrolPoints;
      if (!hasPoint && code !== 100) return false;
      return true;
    })
    .map(normaliseDetail);
}

// ── Normalise combo point ────────────────────────────────────
function normalisePoint(r) {
  return {
    uid:  Number(r.uid ?? r.Uid ?? 0),
    // SP PR_Get_PatrolPointsData_ForPatrolPlan returns column "PatrolPoints"
    name: r.PatrolPoints ?? r.patrolpoints ?? r.gname ?? r.GName ?? r.name ?? "",
    code: r.gcode ?? r.GCode ?? r.code ?? "",
  };
}

// ── Plan Order dropdown (1-25) ───────────────────────────────
const ORDER_OPTIONS = Array.from({length:25}, (_,i) => i+1);

// ── Detail row editor ────────────────────────────────────────
function DetailRow({ row, index, points, onSave, onDelete, isNew }) {
  const [edit, setEdit]       = useState(isNew ? { patrolPointUid: "", planOrder: index+1, leadTime: 0 } : null);
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!edit.patrolPointUid) return;
    setSaving(true);
    await onSave({ ...edit, tempIndex: index });
    setSaving(false);
    setEdit(null);
  };

  if (edit) {
    return (
      <tr style={{background:"var(--surface2)"}}>
        <td style={{textAlign:"center",color:"var(--text3)",fontSize:12}}>{index+1}</td>
        <td>
          <select className="form-input" style={{padding:"4px 8px",fontSize:13}}
            value={edit.planOrder}
            onChange={e=>setEdit(p=>({...p,planOrder:Number(e.target.value)}))}>
            {ORDER_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </td>
        <td>
          <select className="form-input" style={{padding:"4px 8px",fontSize:13}}
            value={edit.patrolPointUid}
            onChange={e=>setEdit(p=>({...p,patrolPointUid:Number(e.target.value)}))}>
            <option value="">— Select Patrol Point —</option>
            {points.map(p=><option key={p.uid} value={p.uid}>{p.name}{p.code?` (${p.code})`:""}</option>)}
          </select>
        </td>
        <td>
          <input type="number" className="form-input" style={{padding:"4px 8px",fontSize:13,width:80}}
            value={edit.leadTime} min={0}
            onChange={e=>setEdit(p=>({...p,leadTime:Number(e.target.value)}))}
            placeholder="mins"/>
        </td>
        <td>
          <div style={{display:"flex",gap:4}}>
            <button className="btn btn-primary btn-xs" onClick={handleSave} disabled={saving||!edit.patrolPointUid}>
              {saving?<span className="spin-sm"/>:<Save size={11}/>}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={()=>setEdit(null)}><X size={11}/></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
        onMouseLeave={e=>e.currentTarget.style.background=""}>
      <td style={{textAlign:"center",color:"var(--text3)",fontSize:12}}>{index+1}</td>
      <td style={{textAlign:"center"}}>{row.planOrder}</td>
      <td style={{fontWeight:600}}>{row.patrolPointName||"—"}</td>
      <td style={{textAlign:"center"}}>{row.leadTime||0} mins</td>
      <td>
        <div style={{display:"flex",gap:4}}>
          <button className="btn btn-ghost btn-xs" onClick={()=>setEdit({
            patrolPointUid: row.patrolPointUid,
            planOrder:      row.planOrder,
            leadTime:       row.leadTime,
            uid:            row.uid,
          })}><Pencil size={11}/></button>
          <button className="btn btn-ghost-danger btn-xs" onClick={()=>onDelete(row.uid)}><Trash2 size={11}/></button>
        </div>
      </td>
    </tr>
  );
}

// ── Plan Form (Add/Edit) ─────────────────────────────────────
function PlanForm({ plan, onClose, onSaved }) {
  const [planName, setPlanName]   = useState(plan?.planName || "");
  const [details, setDetails]     = useState([]);
  const [points, setPoints]       = useState([]);
  const [planUid, setPlanUid]     = useState(plan?.uid || null);
  const [saving, setSaving]       = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [toast, setToast]         = useState(null);
  const [nameError, setNameError] = useState("");

  // Load patrol points combo
  useEffect(() => {
    api.get("/patrol/points-combo")
      .then(r => setPoints((r.data?.data||[]).map(normalisePoint)))
      .catch(() => {});
  }, []);

  // Load existing details when editing
  useEffect(() => {
    if (!plan?.uid) return;
    api.get(`/patrol/plans/${plan.uid}/list`)
      .then(r => setDetails(filterAndNormalise(r.data?.data)))
      .catch(() => {});
  }, [plan?.uid]);

  // Save plan header first, then allow adding details
  const savePlanHeader = async () => {
    if (!planName.trim()) { setNameError("Plan name is required"); return false; }
    setNameError("");
    setSaving(true);
    try {
      if (planUid) {
        await api.put(`/patrol/plans/${planUid}`, { planName });
        return true;
      } else {
        const r = await api.post("/patrol/plans", { planName });
        if (!r.data?.success) { setToast({type:"error",msg:r.data?.message||"Failed"}); return false; }
        const newUid = r.data?.uid || r.data?.data?.uid || r.data?.data?.Uid;
        if (!newUid) { setToast({type:"error",msg:"Plan saved but could not get UID for adding details"}); return false; }
        setPlanUid(newUid);
        return newUid;
      }
    } catch(err) {
      setToast({type:"error",msg:err.response?.data?.message||"Failed"});
      return false;
    } finally { setSaving(false); }
  };

  const handleAddDetail = async (row) => {
    let uid = planUid;
    if (!uid) {
      uid = await savePlanHeader();
      if (!uid) return;
    }
    try {
      const r = await api.post(`/patrol/plans/${uid}/detail`, {
        patrolPointUid: Number(row.patrolPointUid),
        planOrder:      Number(row.planOrder) || 1,
        leadTime:       Number(row.leadTime)  || 0,
      });
      // Check SP response — accept 100 or 101 as success
      const rc  = r.data?.data?.ResponseCode ?? (r.data?.success ? 100 : 102);
      const msg = r.data?.message || r.data?.data?.ResponseMessage || "";
      if (r.data?.success === false || rc > 101) {
        setToast({type:"error", msg:msg||"Failed to add patrol point"}); return;
      }
      // Reload details safely
      try {
        const d = await api.get(`/patrol/plans/${uid}/list`);
        setDetails(filterAndNormalise(d.data?.data));
      } catch { /* reload failed — keep existing rows */ }
      setAddingRow(false);
      setToast({type:"success", msg:"Patrol point added"});
    } catch(err) {
      console.error("[handleAddDetail]", err);
      setToast({type:"error", msg:err.response?.data?.message||"Failed"});
    }
  };

  const handleUpdateDetail = async (row) => {
    // Delete old + insert new (SP is insert/delete only)
    try {
      if (row.uid) {
        await api.delete(`/patrol/plans/${planUid}/detail/${row.uid}`);
      }
      const r = await api.post(`/patrol/plans/${planUid}/detail`, {
        patrolPointUid: row.patrolPointUid,
        planOrder:      row.planOrder,
        leadTime:       row.leadTime,
      });
      if (!r.data?.success) { setToast({type:"error",msg:r.data?.message||"Failed"}); return; }
      const d = await api.get(`/patrol/plans/${planUid}/list`);
      setDetails(filterAndNormalise(d.data?.data));
      setToast({type:"success",msg:"Row updated"});
    } catch(err) { setToast({type:"error",msg:err.response?.data?.message||"Failed"}); }
  };

  const handleDeleteDetail = async (detailUid) => {
    if (!confirm("Delete this patrol point from plan?")) return;
    try {
      await api.delete(`/patrol/plans/${planUid}/detail/${detailUid}`);
      setDetails(d => d.filter(r => r.uid !== detailUid));
      setToast({type:"success",msg:"Deleted"});
    } catch(err) { setToast({type:"error",msg:"Failed to delete"}); }
  };

  const handleSaveAndClose = async () => {
    const result = await savePlanHeader();
    if (result) { onSaved(); onClose(); }
  };

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
      <div onClick={onClose} style={{position:"fixed",top:0,left:0,bottom:0,right:"min(700px,95vw)",zIndex:401}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:402,width:"min(700px,95vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column"}}>
        <Toast toast={toast} onClose={()=>setToast(null)}/>

        {/* Header */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
            <Shield size={16} style={{color:"var(--accent)"}}/>{plan?"Edit":"Add"} Patrol Plan
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
        </div>

        {/* Plan Name row */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <div className="form-group" style={{flex:1,marginBottom:0}}>
              <label className="form-label">Plan Name <span className="req">*</span></label>
              <input className={`form-input ${nameError?"err":""}`}
                value={planName} onChange={e=>{setPlanName(e.target.value);setNameError("");}}
                placeholder="e.g. Night Patrol Plan"/>
              {nameError&&<div className="form-error">{nameError}</div>}
            </div>
            <button className="btn btn-primary" onClick={savePlanHeader} disabled={saving}>
              {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/> Save Name</>}
            </button>
          </div>
        </div>

        {/* Detail table */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:13}}>
              Patrol Points
              <span style={{fontSize:11,color:"var(--text3)",marginLeft:8}}>({details.length} added)</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={()=>setAddingRow(true)} disabled={!planUid && !plan}>
              <Plus size={13}/> Add Point
            </button>
          </div>
          {!planUid && !plan && (
            <div style={{padding:16,background:"var(--surface2)",borderRadius:"var(--radius-sm)",fontSize:13,color:"var(--text3)",textAlign:"center"}}>
              Save the Plan Name first to start adding patrol points
            </div>
          )}
          {(planUid || plan) && (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th style={{width:50}}>Sl No</th>
                  <th style={{width:100}}>Plan Order</th>
                  <th>Patrol Points</th>
                  <th style={{width:120}}>Lead Time (mins)</th>
                  <th style={{width:80}}>Actions</th>
                </tr></thead>
                <tbody>
                  {details.map((row,i)=>(
                    <DetailRow key={row.uid??i} row={row} index={i} points={points}
                      onSave={handleUpdateDetail} onDelete={handleDeleteDetail} isNew={false}/>
                  ))}
                  {addingRow && (
                    <DetailRow row={null} index={details.length} points={points}
                      onSave={handleAddDetail} onDelete={()=>setAddingRow(false)} isNew={true}/>
                  )}
                  {!addingRow && details.length === 0 && (
                    <tr><td colSpan={5} style={{textAlign:"center",color:"var(--text3)",padding:20,fontSize:13}}>
                      No patrol points added yet. Click "Add Point" to start.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:"1px solid var(--border)",display:"flex",gap:8,justifyContent:"flex-end",flexShrink:0}}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleSaveAndClose} disabled={saving}>
            {saving?<><span className="spin-sm"/>Saving...</>:<><Save size={15}/> Save &amp; Close</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PatrolPlan() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [form, setForm]       = useState(null); // null | plan obj for edit | {} for add

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/patrol/plans");
      setRows((r.data?.data||[]).map(normaliseGrid));
    } catch { setToast({type:"error",msg:"Failed to load patrol plans"}); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async uid => {
    if (!confirm("Delete this patrol plan?")) return;
    try {
      await api.delete(`/patrol/plans/${uid}`);
      setToast({type:"success",msg:"Deleted"}); load();
    } catch { setToast({type:"error",msg:"Failed to delete"}); }
  };

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      {form !== null && (
        <PlanForm
          plan={form.uid ? form : null}
          onClose={()=>setForm(null)}
          onSaved={load}/>
      )}

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>Patrol Plan</h1>
          <p>{rows.length} plan{rows.length!==1?"s":""}</p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={()=>setForm({})}><Plus size={15}/> New Plan</button>
        </div>
      </div>

      {loading?<div className="spinner-page"><div className="spinner"/></div>
      :rows.length===0?(
        <div className="empty-state">
          <div className="empty-icon"><Shield size={22}/></div>
          <h3>No patrol plans</h3>
          <p>Create patrol plans to assign patrol routes</p>
          <button className="btn btn-primary" style={{marginTop:8}} onClick={()=>setForm({})}><Plus size={14}/> New Plan</button>
        </div>
      ):(
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{width:60}}>Sl No</th>
              <th>Patrol Plan Name</th>
              <th style={{width:120}}>Patrol Points</th>
              <th style={{width:120}}>Duration</th>
              <th style={{width:120}}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={row.uid??i}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td className="td-muted" style={{textAlign:"center"}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{row.planName||"—"}</td>
                  <td style={{textAlign:"center"}}>{row.patrolPoints||0}</td>
                  <td>{row.duration||"—"}</td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setForm(row)}><Pencil size={11}/> Edit</button>
                      <button className="btn btn-ghost-danger btn-xs" onClick={()=>handleDelete(row.uid)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}