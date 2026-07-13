import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getVisitors } from "../services/visitorService";
import { getVehicles }  from "../services/vehicleService";
import {
  Users, Car, UserCheck, CarFront,
  LayoutDashboard, Shield, Building2,
  MapPin, BadgeCheck, Layers, UserCog
} from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];

const MODULES = [
  { Icon: Users,      label: "Visitors",        path: "/visitors",           color: "blue"   },
  { Icon: Car,        label: "Vehicles",         path: "/vehicles",           color: "green"  },
  { Icon: Shield,     label: "Security Patrol",  path: "/patrol",             color: "purple" },
  { Icon: Layers,     label: "Gates",            path: "/setup/gates",        color: "amber"  },
  { Icon: BadgeCheck, label: "Securities",       path: "/setup/securities",   color: "blue"   },
  { Icon: Building2,  label: "Designations",     path: "/setup/designations", color: "green"  },
  { Icon: MapPin,     label: "Locations",        path: "/setup/locations",    color: "purple" },
  { Icon: UserCog,    label: "User Management",  path: "/users",              color: "amber"  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats, setStats]   = useState({ visitors: 0, visitorsIn: 0, vehicles: 0, vehiclesIn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dt = today();
    Promise.all([
      getVisitors(dt).catch(() => ({ data: [] })),
      getVehicles(dt).catch(() =>  ({ data: [] })),
    ]).then(([v, vh]) => {
      const vis = v.data  || [];
      const veh = vh.data || [];
      setStats({
        visitors:   vis.length,
        visitorsIn: vis.filter(r => !r.OutTime && !r.outTime).length,
        vehicles:   veh.length,
        vehiclesIn: veh.filter(r => !r.OutTime && !r.outTime).length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const STATS = [
    { label: "Total Visitors",   val: stats.visitors,   sub: "Today",       Icon: Users,     color: "blue"   },
    { label: "Visitors Inside",  val: stats.visitorsIn, sub: "Currently",   Icon: UserCheck, color: "green"  },
    { label: "Total Vehicles",   val: stats.vehicles,   sub: "Today",       Icon: Car,       color: "amber"  },
    { label: "Vehicles Inside",  val: stats.vehiclesIn, sub: "Currently",   Icon: CarFront,  color: "purple" },
  ];

  return (
    <div>
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1>{greeting()}, {user?.userName}</h1>
          <p>{new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STATS.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-top">
              <span className="stat-card-label">{s.label}</span>
              <div className={`stat-card-icon ${s.color}`}><s.Icon size={18} /></div>
            </div>
            <div className="stat-card-val">{loading ? "—" : s.val}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div className="section-title">Quick Access</div>
      <div className="module-grid">
        {MODULES.map(m => (
          <button key={m.path} className="module-card" onClick={() => navigate(m.path)}>
            <div className={`module-card-icon stat-card-icon ${m.color}`}>
              <m.Icon size={20} />
            </div>
            <div className="module-card-name">{m.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
