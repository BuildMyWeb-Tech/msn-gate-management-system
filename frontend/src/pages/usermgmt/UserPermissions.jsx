// frontend/src/pages/usermgmt/UserPermissions.jsx
//
// ✅ FIX: Backend now returns flat array — res.data is [{menuDUid, menuName...}]
//         so (res.data || []).filter(...) works correctly.

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Shield, Save, X, ArrowLeft,
  CheckSquare, Square, ChevronRight,
} from "lucide-react";
import {
  getUserPermissions,
  saveUserPermissions,
  getUsers,
} from "../../services/userService";

const PERM_DEFS = [
  { key: "MWrite",  label: "C", title: "Create", color: "#22c55e" },
  { key: "MRead",   label: "R", title: "Read",   color: "#60a5fa" },
  { key: "MUpdate", label: "U", title: "Update", color: "#f59e0b" },
  { key: "MDelete", label: "D", title: "Delete", color: "#f87171" },
  { key: "MPrint",  label: "P", title: "Print",  color: "#a78bfa" },
];

function PermCheck({ label, title, checked, onChange, color }) {
  return (
    <label title={title} className="um-perm-check">
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ display: "none" }}
      />
      {checked
        ? <CheckSquare size={15} style={{ color, flexShrink: 0 }} />
        : <Square      size={15} style={{ color: "#2d3f53", flexShrink: 0 }} />
      }
      <span style={{ color: checked ? color : "#475569", fontWeight: checked ? 700 : 400, fontSize: 11 }}>
        {label}
      </span>
    </label>
  );
}

export default function UserPermissions() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const location = useLocation();

  const [username, setUsername] = useState(location.state?.username || "");
  const [menuData, setMenuData] = useState([]);
  const [perms,    setPerms]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // ── Fetch username if not passed via nav state ─────────────────────────────
  useEffect(() => {
    if (username) return;
    (async () => {
      try {
        const [r1, r0] = await Promise.all([getUsers(1), getUsers(0)]);
        const user = [...(r1.data || []), ...(r0.data || [])].find(
          u => u.uid === Number(id)
        );
        if (user?.username) setUsername(user.username);
      } catch { /* silently ignore */ }
    })();
  }, [id, username]);

  // ── Load permissions ───────────────────────────────────────────────────────
  //
  // Backend now returns a flat normalised array:
  //   res.data = [{ menuDUid, menuName, parentMenu, permissions:{...} }, ...]
  //
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await getUserPermissions(id);
      if (!res.success) throw new Error(res.message || "Failed to load permissions");

      // ✅ res.data is now a flat array (normalised in backend service)
      const flat = (res.data || []).filter(
        m => m.menuDUid != null && Number(m.menuDUid) > 0
      );

      setMenuData(flat);

      // Pre-populate checkbox state from existing permissions
      const map = {};
      flat.forEach(m => { map[m.menuDUid] = { ...m.permissions }; });
      setPerms(map);

    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const toggle = (menuId, permKey, checked) => {
    setPerms(prev => ({
      ...prev,
      [menuId]: {
        ...(prev[menuId] || { MWrite:0, MRead:0, MUpdate:0, MDelete:0, MPrint:0, UID:0 }),
        [permKey]: checked ? 1 : 0,
      },
    }));
  };

  const toggleRow = (menuId, checked) => {
    setPerms(prev => ({
      ...prev,
      [menuId]: {
        UID: prev[menuId]?.UID || 0,
        ...PERM_DEFS.reduce((a, p) => ({ ...a, [p.key]: checked ? 1 : 0 }), {}),
      },
    }));
  };

  const toggleAll = (checked) => {
    const next = {};
    menuData.forEach(m => {
      next[m.menuDUid] = {
        UID: perms[m.menuDUid]?.UID || 0,
        ...PERM_DEFS.reduce((a, p) => ({ ...a, [p.key]: checked ? 1 : 0 }), {}),
      };
    });
    setPerms(next);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const validPerms = {};
      Object.entries(perms).forEach(([key, val]) => {
        const n = Number(key);
        if (!isNaN(n) && n > 0) validPerms[n] = val;
      });

      if (Object.keys(validPerms).length === 0) {
        setError("Please select at least one permission before saving.");
        setSaving(false);
        return;
      }

      const res = await saveUserPermissions(id, validPerms);
      if (!res.success) throw new Error(res.message);

      navigate("/user-management/users", {
        state: { toast: { msg: "Permissions saved successfully", type: "success" } },
      });
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Save failed");
      setSaving(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const groups = menuData.reduce((acc, m) => {
    const p = m.parentMenu || "General";
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {});

  const isRowFull  = mid => PERM_DEFS.every(p => (perms[mid]?.[p.key] ?? 0) === 1);
  const isRowEmpty = mid => PERM_DEFS.every(p => (perms[mid]?.[p.key] ?? 0) === 0);
  const allChecked = menuData.length > 0 && menuData.every(m => isRowFull(m.menuDUid));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="um-perm-wrap">

      {/* ── Breadcrumb ── */}
      <div className="um-breadcrumb">
        <button className="um-breadcrumb-back" onClick={() => navigate("/user-management/users")}>
          <ArrowLeft size={14} /> Users
        </button>
        <ChevronRight size={13} className="um-breadcrumb-sep" />
        <span className="um-breadcrumb-next">Step 1: User Details</span>
        <ChevronRight size={13} className="um-breadcrumb-sep" />
        <span className="um-breadcrumb-active">Step 2: Permissions</span>
      </div>

      {/* ── Step indicator ── */}
      <div className="um-steps">
        <div className="um-step um-step--done">
          <div className="um-step-num um-step-num--done">✓</div>
          <div className="um-step-label">User Details</div>
        </div>
        <div className="um-step-line um-step-line--done" />
        <div className="um-step um-step--active">
          <div className="um-step-num">2</div>
          <div className="um-step-label">Permissions</div>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="um-perm-card">

        {/* Header */}
        <div className="um-perm-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="um-perm-card-icon"><Shield size={17} /></div>
            <div>
              <div className="um-card-title">
                Assign Permissions
                {username && (
                  <span style={{ marginLeft: 6, color: "#818cf8", fontWeight: 700 }}>
                    for {username}
                  </span>
                )}
              </div>
              <div className="um-card-subtitle">
                Check the actions each menu allows this user to perform
              </div>
            </div>
          </div>

          {!loading && menuData.length > 0 && (
            <label className="um-select-all-btn" style={{ cursor: "pointer" }}>
              <input
                type="checkbox" checked={allChecked}
                onChange={e => toggleAll(e.target.checked)}
                style={{ display: "none" }}
              />
              {allChecked
                ? <CheckSquare size={15} style={{ color: "#818cf8" }} />
                : <Square      size={15} style={{ color: "#475569" }} />
              }
              <span style={{ marginLeft: 6, fontSize: 13 }}>
                {allChecked ? "Deselect All" : "Select All"}
              </span>
            </label>
          )}
        </div>

        {/* Column headers */}
        {!loading && menuData.length > 0 && (
          <div className="um-perm-col-header">
            <span className="um-perm-col-menu">Menu</span>
            {PERM_DEFS.map(p => (
              <span key={p.key} className="um-perm-col-label" style={{ color: p.color }}>
                {p.title}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="um-perm-body">
          {error && (
            <div className="gm-alert-error" style={{ marginBottom: 12 }}>⚠ {error}</div>
          )}

          {loading ? (
            <div className="gm-loading">
              <div className="gm-spinner" />
              <span>Loading permissions…</span>
            </div>
          ) : menuData.length === 0 ? (
            /* ── Empty state with debug hint ── */
            <div style={{ textAlign: "center", color: "#475569", padding: "40px 0" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                No menus configured in the system.
              </div>
              <div style={{ fontSize: 12, color: "#334155" }}>
                Check your Node.js terminal — column names from
                PR_Get_MenuData_ForUsermanagement are logged there.
              </div>
            </div>
          ) : (
            Object.entries(groups).map(([parent, items]) => (
              <div key={parent} className="um-perm-group">
                <div className="um-perm-group-label">
                  <div className="um-perm-group-dot" />
                  {parent}
                </div>

                {items.map(menu => {
                  const mid      = menu.menuDUid;
                  const rowFull  = isRowFull(mid);
                  const rowEmpty = isRowEmpty(mid);

                  return (
                    <div
                      key={mid}
                      className={`um-perm-row ${
                        rowFull    ? "um-perm-row--full"
                        : rowEmpty ? ""
                        : "um-perm-row--partial"
                      }`}
                    >
                      <label className="um-perm-row-toggle">
                        <input
                          type="checkbox" checked={!rowEmpty}
                          onChange={e => toggleRow(mid, e.target.checked)}
                          style={{ display: "none" }}
                        />
                        {rowEmpty
                          ? <Square      size={15} style={{ color: "#2d3f53" }} />
                          : <CheckSquare size={15} style={{ color: "#818cf8" }} />
                        }
                      </label>

                      <span className={`um-perm-menu-name ${rowEmpty ? "um-perm-menu-name--muted" : ""}`}>
                        {menu.menuName}
                      </span>

                      <div className="um-perm-checks">
                        {PERM_DEFS.map(p => (
                          <PermCheck
                            key={p.key} label={p.label} title={p.title}
                            checked={(perms[mid]?.[p.key] ?? 0) === 1}
                            onChange={checked => toggle(mid, p.key, checked)}
                            color={p.color}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="um-perm-footer">
            <div className="um-perm-legend">
              {PERM_DEFS.map(p => (
                <span key={p.key} className="um-perm-legend-item" style={{ color: p.color }}>
                  <span
                    className="um-perm-legend-badge"
                    style={{ background: `${p.color}18`, border: `1px solid ${p.color}35` }}
                  >
                    {p.label}
                  </span>
                  {p.title}
                </span>
              ))}
            </div>
            <div className="um-perm-footer-btns">
              <button
                className="gm-btn-cancel"
                onClick={() => navigate("/user-management/users")}
                disabled={saving}
              >
                <X size={13} style={{ marginRight: 4 }} /> Cancel
              </button>
              <button
                className="gm-btn-save"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? <span className="gm-spinner-sm" /> : <Save size={14} />}
                Save Permissions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}