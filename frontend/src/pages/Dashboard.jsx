import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";
import { Users, Car, Shield, Clock, Plus, RefreshCw } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];

export default function Dashboard() {
  const { user, isMobileUser } = useAuth();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    visitorsInside: 0, visitorsTotal: 0,
    vehiclesInside: 0, vehiclesTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [date] = useState(today());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const gateId = user?.gateId || 0;
        const [vRes, vhRes] = await Promise.allSettled([
          api.get(`/visitors?date=${date}&gateId=${gateId}`),
          api.get(`/vehicles?date=${date}&gateId=${gateId}`),
        ]);
        if (cancelled) return;

        const visitors = vRes.status  === "fulfilled" ? (vRes.value.data?.data  || []) : [];
        const vehicles = vhRes.status === "fulfilled" ? (vhRes.value.data?.data || []) : [];

        setStats({
          visitorsInside: visitors.filter(v => !v.outTime).length,
          visitorsTotal:  visitors.length,
          vehiclesInside: vehicles.filter(v => !v.outTime).length,
          vehiclesTotal:  vehicles.length,
        });
      } catch { /* stats fail silently */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [date, user?.gateId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const StatCard = ({ label, value, sub, Icon, color, onClick }) => (
    <div onClick={onClick}
      style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"var(--radius)", padding:isMobile?16:20,
        cursor:onClick?"pointer":"default",
        transition:"all .15s",
        display:"flex", flexDirection:"column", gap:12,
      }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.borderColor="var(--accent)")}
      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
        <div style={{width:36,height:36,borderRadius:"var(--radius-sm)",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon size={18} style={{color}}/>
        </div>
      </div>
      <div>
        <div style={{fontSize:36,fontWeight:800,lineHeight:1,letterSpacing:"-0.03em",color:"var(--text)"}}>
          {loading ? <span style={{fontSize:20,color:"var(--text3)"}}>—</span> : value}
        </div>
        <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>{sub}</div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Greeting */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:"-0.02em"}}>
          {greeting()}, {user?.userName || "User"} 👋
        </h1>
        <p style={{fontSize:13,color:"var(--text2)",marginTop:4}}>
          {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          {user?.gateName && <span style={{color:"var(--accent)",marginLeft:8}}>· {user.gateName}</span>}
        </p>
      </div>

      {/* Quick actions — mobile prominent */}
      {isMobile && (
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          <button className="btn btn-primary" style={{flex:1,padding:"12px"}}
            onClick={()=>navigate("/visitors/new")}>
            <Plus size={16}/> New Visitor
          </button>
          <button className="btn btn-ghost" style={{flex:1,padding:"12px"}}
            onClick={()=>navigate("/vehicles/new")}>
            <Plus size={16}/> New Vehicle
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div style={{
        display:"grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
        gap:isMobile?10:14,
        marginBottom:20,
      }}>
        <StatCard
          label="Visitors Inside" value={stats.visitorsInside}
          sub={`${stats.visitorsTotal} total today`}
          Icon={Users} color="var(--green)"
          onClick={()=>navigate("/visitors")}/>
        <StatCard
          label="Vehicles Inside" value={stats.vehiclesInside}
          sub={`${stats.vehiclesTotal} total today`}
          Icon={Car} color="var(--blue)"
          onClick={()=>navigate("/vehicles")}/>
        {!isMobile && (
          <>
            <StatCard
              label="Today's Date" value={new Date().getDate()}
              sub={new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
              Icon={Clock} color="var(--accent)"/>
            <StatCard
              label="Gate" value={user?.gateName||"All"}
              sub="Active gate"
              Icon={Shield} color="var(--purple)"/>
          </>
        )}
      </div>

      {/* Quick nav — desktop */}
      {!isMobile && (
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-primary" onClick={()=>navigate("/visitors/new")}><Plus size={15}/> New Visitor</button>
          <button className="btn btn-ghost"   onClick={()=>navigate("/visitors")}><Users size={14}/> View Visitors</button>
          <button className="btn btn-ghost"   onClick={()=>navigate("/vehicles/new")}><Plus size={15}/> New Vehicle</button>
          <button className="btn btn-ghost"   onClick={()=>navigate("/vehicles")}><Car size={14}/> View Vehicles</button>
        </div>
      )}
    </div>
  );
}