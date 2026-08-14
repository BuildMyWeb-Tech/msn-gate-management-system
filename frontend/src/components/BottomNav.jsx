import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, Car } from "lucide-react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", Icon: Home  },
  { path: "/visitors",  label: "Visitors",  Icon: Users },
  { path: "/vehicles",  label: "Vehicles",  Icon: Car   },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      display: "flex", zIndex: 300,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const active = location.pathname.startsWith(path);
        return (
          <button key={path} onClick={() => navigate(path)}
            style={{
              flex: 1, padding: "10px 0 8px",
              background: "none", border: "none",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              color: active ? "var(--accent)" : "var(--text3)",
              transition: "color .15s",
            }}>
            <Icon size={20}/>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}