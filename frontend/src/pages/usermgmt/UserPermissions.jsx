import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { ArrowLeft, Save, Key, CheckSquare, Square } from "lucide-react";

// Permission columns — matches Image 2: CREATE READ UPDATE DELETE PRINT
const PERM_KEYS   = ["MWrite", "MRead", "MUpdate", "MDelete", "MPrint"];
const PERM_LABELS = { MWrite: "CREATE", MRead: "READ", MUpdate: "UPDATE", MDelete: "DELETE", MPrint: "PRINT" };
const PERM_SHORT  = { MWrite: "C", MRead: "R", MUpdate: "U", MDelete: "D", MPrint: "P" };

export default function UserPermissions() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const location    = useLocation();
  const { isMobile } = useResponsive();
  const username    = location.state?.username || `User #${id}`;

  const [menus, setMenus]     = useState([]);   // flat list from SP
  const [perms, setPerms]     = useState({});   // { [menuDUid]: { MWrite, MRead, ... } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    api.get(`/users/${id}/permissions`)
      .then(r => {
        const data = r.data?.data || [];
        setMenus(data);
        const p = {};
        data.forEach(m => { p[m.menuDUid] = { ...m.permissions }; });
        setPerms(p);
      })
      .catch(() => setToast({ type: "error", msg: "Failed to load permissions" }))
      .finally(() => setLoading(false));
  }, [id]);

  const toggle = (menuDUid, key) => {
    setPerms(p => ({
      ...p,
      [menuDUid]: { ...p[menuDUid], [key]: p[menuDUid]?.[key] ? 0 : 1 },
    }));
  };

  const toggleRow = menuDUid => {
    const cur  = perms[menuDUid] || {};
    const allOn = PERM_KEYS.every(k => cur[k]);
    setPerms(p => ({
      ...p,
      [menuDUid]: Object.fromEntries(PERM_KEYS.map(k => [k, allOn ? 0 : 1])),
    }));
  };

  // Select All / Deselect All
  const allOn = menus.length > 0 && menus.every(m => PERM_KEYS.every(k => perms[m.menuDUid]?.[k]));
  const toggleAll = () => {
    const val = allOn ? 0 : 1;
    const p   = {};
    menus.forEach(m => { p[m.menuDUid] = Object.fromEntries(PERM_KEYS.map(k => [k, val])); });
    setPerms(p);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await api.post(`/users/${id}/permissions`, { permissions: perms });
      setToast({ type: "success", msg: "Permissions saved successfully" });
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  // Group menus by parentMenu
  const grouped = menus.reduce((acc, m) => {
    const g = m.parentMenu || "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(m);
    return acc;
  }, {});

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}><Key size={20} /> Permissions</h1>
          <p>Managing access for <strong>{username}</strong></p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost" onClick={() => navigate("/users")}><ArrowLeft size={15} /> Back</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spin-sm" />Saving...</> : <><Save size={15} /> Save Permissions</>}
          </button>
        </div>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Key size={22} /></div>
          <h3>No menus configured</h3>
          <p>No menu items found to assign permissions</p>
        </div>
      ) : (
        <div className="card">
          {/* Header row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--border)",
            flexWrap: "wrap", gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <Key size={15} />
                Assign Permissions for <span style={{ color: "var(--accent)" }}>{username}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>
                Check the actions each menu allows this user to perform
              </div>
            </div>
            {/* Select All */}
            <button
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text2)", fontSize: 13, cursor: "pointer",
                transition: "all .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {allOn ? <CheckSquare size={15} style={{ color: "var(--accent)" }} /> : <Square size={15} />}
              Select All
            </button>
          </div>

          {/* Permission groups */}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 20 }}>
              {/* Group label — like "● SETUP" in Image 2 */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                color: "var(--accent)", textTransform: "uppercase",
                marginBottom: 8,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--accent)", flexShrink: 0,
                }} />
                {group}
              </div>

              <div className="table-wrap" style={{ marginBottom: 4 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Menu</th>
                      {PERM_KEYS.map(k => (
                        <th key={k} style={{ textAlign: "center", width: isMobile ? 36 : 70 }}>
                          {isMobile ? PERM_SHORT[k] : PERM_LABELS[k]}
                        </th>
                      ))}
                      <th style={{ textAlign: "center", width: 56 }}>All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(m => {
                      const p      = perms[m.menuDUid] || {};
                      const rowAll = PERM_KEYS.every(k => p[k]);
                      return (
                        <tr key={m.menuDUid}>
                          {/* Row checkbox */}
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={rowAll}
                              onChange={() => toggleRow(m.menuDUid)}
                              style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.menuName}</div>
                            {!isMobile && m.parentMenu && (
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>{m.parentMenu}</div>
                            )}
                          </td>
                          {PERM_KEYS.map(k => (
                            <td key={k} style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={Boolean(p[k])}
                                onChange={() => toggle(m.menuDUid, k)}
                                style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                              />
                            </td>
                          ))}
                          {/* All toggle button per row */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => toggleRow(m.menuDUid)}
                              style={{
                                padding: "3px 8px", fontSize: 11, fontWeight: 700,
                                background: rowAll ? "var(--accent)" : "transparent",
                                color: rowAll ? "#000" : "var(--text2)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-xs)",
                                cursor: "pointer", transition: "all .15s",
                              }}
                            >
                              All
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}