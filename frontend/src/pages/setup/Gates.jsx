import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { Layers, RefreshCw, Plus, X, Save, Pencil, Trash2, Search } from "lucide-react";

const EMPTY = { uid:0, code:"", name:"", shortName:"" };

function normalise(r) {
  return {
    uid:       Number(r.uid ?? r.Uid ?? r.UId ?? 0),
    code:      r.gcode  ?? r.GCode  ?? r.code  ?? "",
    name:      r.gname  ?? r.GName  ?? r.name  ?? "",
    shortName: r.gsname ?? r.GSName ?? r.shortName ?? "",
    active:    r.active ?? r.Active ?? true,
    serialNo:  r.serial_no ?? r.SerialNo ?? 0,
  };
}

export default function Gates() {
  const [rows,setRows]       = useState([]);
  const [loading,setLoading] = useState(true);
  const [toast,setToast]     = useState(null);
  const [modal,setModal]     = useState(null);
  const [form,setForm]       = useState(EMPTY);
  const [saving,setSaving]   = useState(false);
  const [errors,setErrors]   = useState({});
  const [q,setQ]             = useState("");
  const [tab,setTab]         = useState("Active");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r=await api.get("/setup/gates"); setRows((r.data?.data||[]).map(normalise)); }
    catch { setToast({type:"error",msg:"Failed to load gates"}); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{load();},[load]);

  const openAdd  = () => { setForm(EMPTY); setErrors({}); setModal("form"); };
  const openEdit = row => { setForm({...EMPTY,...row}); setErrors({}); setModal("form"); };
  const onChange = e => { setForm(p=>({...p,[e.target.name]:e.target.value})); if(errors[e.target.name])setErrors(p=>({...p,[e.target.name]:""})); };

  const onSave = async () => {
    if(!form.name?.trim()){setErrors({name:"Gate name is required"});return;}
    setSaving(true);
    try {
      const r=await api.post("/setup/gates",{uid:form.uid||0,code:form.code,name:form.name,shortName:form.shortName});
      const msg = r.data?.message || "";
      // SP can return success:true but message indicates error (e.g. "Already Exists")
      if(r.data?.success===false || msg.toLowerCase().includes("already exists")) {
        setToast({type:"error",msg:msg||"Failed"});return;
      }
      setToast({type:"success",msg:form.uid?"Updated":"Added"});
      setModal(null);load();
    }catch(err){setToast({type:"error",msg:err.response?.data?.message||"Failed"});}
    finally{setSaving(false);}
  };

  const onDelete = async row => {
    if(!confirm(`Delete gate "${row.name}"?`))return;
    try{await api.delete(`/setup/gates/${row.uid}`);setToast({type:"success",msg:"Deleted"});load();}
    catch(err){setToast({type:"error",msg:err.response?.data?.message||"Failed"});}
  };

  const filtered = rows.filter(r=>tab==="Active"?r.active:!r.active).filter(r=>!q||(r.name||"").toLowerCase().includes(q.toLowerCase())||(r.code||"").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Toast toast={toast} onClose={()=>setToast(null)}/>
      {modal==="form"&&(
        <>
          <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",zIndex:400}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:401,width:"min(420px,92vw)",background:"var(--surface)",borderRadius:"var(--radius)",border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:15}}>{form.uid?"Edit":"Add"} Gate</div>
              <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
            </div>
            <div style={{padding:20}}>
              <div className="form-group"><label className="form-label">Gate Code</label><input name="code" className="form-input" value={form.code} onChange={onChange} placeholder="G001" autoFocus/></div>
              <div className="form-group">
                <label className="form-label">Gate Name <span className="req">*</span></label>
                <input name="name" className={`form-input ${errors.name?"err":""}`} value={form.name} onChange={onChange} placeholder="e.g. Main Gate"/>
                {errors.name&&<div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-group"><label className="form-label">Short Name</label><input name="shortName" className="form-input" value={form.shortName} onChange={onChange} placeholder="MG"/></div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving?<><span className="spin-sm"/>Saving...</>:<><Save size={14}/>Save</>}</button>
            </div>
          </div>
        </>
      )}
      <div className="page-hdr">
        <div className="page-hdr-left"><h1>Gates</h1><p>{filtered.length} records &bull; {tab}</p></div>
        <div className="page-hdr-actions"><button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add New</button></div>
      </div>
      <div className="toolbar">
        <div style={{display:"flex",gap:0,border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",overflow:"hidden"}}>
          {["Active","Inactive"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 16px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===t?"var(--accent)":"none",color:tab===t?"#000":"var(--text2)",transition:"all .15s"}}>{t}</button>
          ))}
        </div>
        <div style={{flex:1,position:"relative"}}>
          <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}/>
          <input className="form-input" placeholder="Search gates..." value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:32}}/>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
      </div>
      {loading?<div className="spinner-page"><div className="spinner"/></div>:filtered.length===0?(
        <div className="empty-state"><div className="empty-icon"><Layers size={22}/></div><h3>No gates</h3></div>
      ):(
        <div className="table-wrap"><table>
          <thead><tr><th style={{width:50}}>#</th><th>Gate Code</th><th>Gate Name</th><th>Short Name</th><th style={{width:100}}>Action</th></tr></thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={row.uid??i} onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td className="td-muted" style={{textAlign:"center"}}>{row.serialNo||i+1}</td>
                <td className="td-muted">{row.code||"—"}</td>
                <td style={{fontWeight:600}}>{row.name||"—"}</td>
                <td className="td-muted">{row.shortName||"—"}</td>
                <td><div style={{display:"flex",gap:4}}>
                  <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(row)}><Pencil size={11}/> Edit</button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={()=>onDelete(row)}><Trash2 size={11}/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}