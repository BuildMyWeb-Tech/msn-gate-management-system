import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { ArrowLeft, Save, Key, Check } from "lucide-react";

const PERM_KEYS = ["MRead", "MWrite", "MUpdate", "MDelete", "MPrint"];
const PERM_LABELS = { MRead: "Read", MWrite: "Write", MUpdate: "Update", MDelete: "Delete", MPrint: "Print" };

export default function UserPermissions() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const location  = useLocation();
  const username  = location.state?.username || `User #${id}`;

  const [menus, setMenus]   = useState([]);
  const [perms, setPerms]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);

  useEffect(() => {
    api.get(`/users/${id}/permissions`).then(r => {
      const data = r.data?.data || [];
      setMenus(data);
      const p = {};
      data.forEach(m => { p[m.menuDUid] = { ...m.permissions }; });
      setPerms(p);
    }).catch(() => setToast({ type: "error", msg: "Failed to load permissions" }))
      .finally(() => setLoading(false));
  }, [id]);

  const toggle = (menuDUid, key) => {
    setPerms(p => ({
      ...p,
      [menuDUid]: { ...p[menuDUid], [key]: p[menuDUid]?.[key] ? 0 : 1 }
    }));
  };

  const toggleAll = (menuDUid) => {
    const cur = perms[menuDUid] || {};
    const allOn = PERM_KEYS.every(k => cur[k]);
    setPerms(p => ({
      ...p,
      [menuDUid]: Object.fromEntries(PERM_KEYS.map(k => [k, allOn ? 0 : 1]))
    }));
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

  // Group by parentMenu
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
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}><Key size={20} />Permissions</h1>
          <p>Managing access for <strong>{username}</strong></p>
        </div>
        <div className="page-hdr-actions">
          <button className="btn btn-ghost" onClick={() => navigate("/users")}><ArrowLeft size={15} />Back</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spin-sm" />Saving...</> : <><Save size={15} />Save Permissions</>}
          </button>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Key size={22} /></div>
          <h3>No menus configured</h3>
          <p>No menu items found to assign permissions</p>
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div className="card" style={{ marginBottom: 14 }} key={group}>
            <div className="card-header"><span className="card-title">{group}</span></div>
            <div className="table-wrap">
              <table className="perm-table">
                <thead>
                  <tr>
                    <th>Menu / Page</th>
                    {PERM_KEYS.map(k => <th key={k} style={{ textAlign: "center", width: 70 }}>{PERM_LABELS[k]}</th>)}
                    <th style={{ textAlign: "center", width: 60 }}>All</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(m => {
                    const p   = perms[m.menuDUid] || {};
                    const all = PERM_KEYS.every(k => p[k]);
                    return (
                      <tr key={m.menuDUid}>
                        <td>
                          <div className="perm-menu-name">{m.menuName}</div>
                          {m.parentMenu && <div className="perm-parent">{m.parentMenu}</div>}
                        </td>
                        {PERM_KEYS.map(k => (
                          <td key={k} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              className="perm-check"
                              checked={Boolean(p[k])}
                              onChange={() => toggle(m.menuDUid, k)}
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: "center" }}>
                          <button
                            className={`btn btn-xs ${all ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => toggleAll(m.menuDUid)}
                            title={all ? "Remove all" : "Grant all"}
                          >
                            <Check size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
