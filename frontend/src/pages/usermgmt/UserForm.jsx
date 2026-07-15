import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Toast from "../../components/Toast";
import { ArrowLeft, Save, Eye, EyeOff, UserCog } from "lucide-react";

const EMPTY = { userName: "", pwd: "", active: 1 };

export default function UserForm() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const isEdit       = Boolean(id);
  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [toast, setToast]     = useState(null);
  const [showPw, setShowPw]   = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    // Load both active + inactive to find user by uid
    Promise.all([
      api.get("/users?tag=1"),
      api.get("/users?tag=0"),
    ]).then(([a, i]) => {
      const all  = [...(a.data?.data || []), ...(i.data?.data || [])];
      // Service normalises to { uid, userName, active }
      const user = all.find(u => String(u.uid) === String(id));
      if (user) {
        setForm({
          userName: user.userName || "",
          pwd:      "",
          active:   user.active ? 1 : 0,
        });
      }
    }).finally(() => setLoading(false));
  }, [isEdit, id]);

  const onChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.userName.trim()) e.userName = "Username is required";
    if (!isEdit && !form.pwd)  e.pwd      = "Password is required";
    return e;
  };

  const onSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { userName: form.userName, active: form.active };
      if (form.pwd) payload.pwd = form.pwd;

      if (isEdit) {
        await api.put(`/users/${id}`, payload);
        setToast({ type: "success", msg: "User updated" });
      } else {
        await api.post("/users", payload);
        setToast({ type: "success", msg: "User created successfully" });
      }
      setTimeout(() => navigate("/users"), 1200);
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to save" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="page-hdr">
        <div className="page-hdr-left">
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserCog size={20} />
            {isEdit ? "Edit User" : "New User"}
          </h1>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate("/users")}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>

      <div style={{ maxWidth: 480 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><UserCog size={15} />User Details</span>
          </div>

          <div className="form-group">
            <label className="form-label">Username <span className="req">*</span></label>
            <input
              name="userName"
              className={`form-input ${errors.userName ? "err" : ""}`}
              value={form.userName}
              onChange={onChange}
              placeholder="Enter username"
              autoCapitalize="none"
            />
            {errors.userName && <div className="form-error">{errors.userName}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Password{" "}
              {isEdit
                ? <span style={{ fontSize: 11, color: "var(--text3)" }}>(leave blank to keep current)</span>
                : <span className="req">*</span>}
            </label>
            <div className="pw-wrap">
              <input
                name="pwd"
                type={showPw ? "text" : "password"}
                className={`form-input ${errors.pwd ? "err" : ""}`}
                value={form.pwd}
                onChange={onChange}
                placeholder={isEdit ? "New password (optional)" : "Set password"}
                style={{ paddingRight: 42 }}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.pwd && <div className="form-error">{errors.pwd}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                name="active"
                type="checkbox"
                checked={form.active === 1}
                onChange={onChange}
                style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              Active User
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving
                ? <><span className="spin-sm" />Saving...</>
                : <><Save size={15} />{isEdit ? "Save Changes" : "Create User"}</>}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/users")}>
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}