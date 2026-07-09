// frontend/src/pages/usermgmt/UserForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, UserPlus, Save, ArrowLeft, ChevronRight } from "lucide-react";
import { createUser, updateUser, getUsers } from "../../services/userService";

// ═══════════════════════════════════════════════════════════════════════════════
//  PwField — Password input with show/hide toggle
// ═══════════════════════════════════════════════════════════════════════════════
function PwField({ id, label, value, onChange, error, placeholder }) {
  const [show, setShow] = useState(false);

  return (
    <div className="gm-field">
      <label className="gm-label" htmlFor={id}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          className={`gm-input${error ? " error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", color: "#64748b", cursor: "pointer",
          }}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <div className="gm-field-err">{error}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ConfirmPwField — Confirm password with match indicator
// ═══════════════════════════════════════════════════════════════════════════════
function ConfirmPwField({ value, onChange, error, match }) {
  const [show, setShow] = useState(false);

  const borderColor =
    match === true  ? "#22c55e" :
    match === false ? "#f87171" : undefined;

  return (
    <>
      <div style={{ position: "relative" }}>
        <input
          id="cpwd"
          type={show ? "text" : "password"}
          className={`gm-input${error ? " error" : ""}`}
          placeholder="Re-enter password"
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
          style={{ paddingRight: 44, ...(borderColor ? { borderColor } : {}) }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", color: "#64748b", cursor: "pointer",
          }}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <div className="gm-field-err">{error}</div>}
      {!error && match === true  && (
        <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4 }}>
          ✓ Passwords match
        </div>
      )}
      {!error && match === false && (
        <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>
          ✗ Passwords do not match
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN UserForm
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserForm() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [userName, setUserName] = useState("");
  const [pwd,      setPwd]      = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [active,   setActive]   = useState(1);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState("");
  const [loaded,   setLoaded]   = useState(!isEdit);

  // ─── Load existing user in edit mode ───────────────────────────────────────
  // The API returns userpassword in plaintext, so we load it directly into state.
  // The eye icon will then reveal it as-is when toggled.
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const [r1, r0] = await Promise.all([getUsers(1), getUsers(0)]);
        if (cancelled) return;
        const user = [...(r1.data || []), ...(r0.data || [])].find(
          u => u.uid === Number(id)
        );
        if (user) {
          setUserName(user.username      || "");
          setActive(Number(user.active   ?? 1));
          setPwd(user.userpassword       || "");   // ← real password from API
          setConfirm(user.userpassword   || "");   // ← pre-fill confirm to match
        }
      } catch {
        if (!cancelled) setApiError("Failed to load user details");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!userName.trim()) e.userName = "Username is required";

    if (!isEdit) {
      // CREATE — password mandatory
      if (!pwd)                e.pwd     = "Password is required";
      else if (pwd.length < 4) e.pwd     = "Minimum 4 characters";
      if (!confirm)            e.confirm = "Please confirm your password";
      else if (pwd !== confirm) e.confirm = "Passwords do not match";

    } else {
      // EDIT — password is pre-filled; validate if present
      if (pwd && pwd.length < 4)        e.pwd     = "Minimum 4 characters";
      if (pwd && confirm !== pwd)       e.confirm = "Passwords do not match";
      if (pwd && !confirm)              e.confirm = "Please confirm your password";
    }

    return e;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!loaded) return;

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (isEdit) {
        // Send password only if the user has something in the field
        const cleanPwd = pwd || undefined;
        await updateUser(id, { userName: userName.trim(), pwd: cleanPwd, active });
        navigate(`/user-management/users/permissions/${id}`);
      } else {
        const res = await createUser({ userName: userName.trim(), pwd, active });
        if (!res.success) {
          setApiError(res.message || "Failed to create user");
          setSaving(false);
          return;
        }
        const newUserId = res.data?.userId;
        if (!newUserId) {
          setApiError(
            "User saved but ID not returned. Go back and use Edit to set permissions."
          );
          setSaving(false);
          return;
        }
        navigate(`/user-management/users/permissions/${newUserId}`);
      }
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || "Operation failed");
      setSaving(false);
    }
  };

  // ─── Password match indicator ───────────────────────────────────────────────
  const pwMatch =
    pwd && confirm
      ? pwd === confirm
      : null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="um-form-page">
      <div className="um-form-wrap">

        {/* ── Breadcrumb ── */}
        <div className="um-breadcrumb">
          <button
            className="um-breadcrumb-back"
            onClick={() => navigate("/user-management/users")}
          >
            <ArrowLeft size={14} /> Users
          </button>
          <ChevronRight size={13} className="um-breadcrumb-sep" />
          <span className="um-breadcrumb-active">
            Step 1: {isEdit ? "Edit User" : "Create User"}
          </span>
          <ChevronRight size={13} className="um-breadcrumb-sep" />
          <span className="um-breadcrumb-next">Step 2: Permissions</span>
        </div>

        {/* ── Step indicator ── */}
        <div className="um-steps">
          <div className="um-step um-step--active">
            <div className="um-step-num">1</div>
            <div className="um-step-label">User Details</div>
          </div>
          <div className="um-step-line" />
          <div className="um-step um-step--pending">
            <div className="um-step-num">2</div>
            <div className="um-step-label">Permissions</div>
          </div>
        </div>

        {/* ── Card ── */}
        <div className="um-card">
          <div className="um-card-header">
            <div className="um-card-icon"><UserPlus size={18} /></div>
            <div>
              <div className="um-card-title">{isEdit ? "Edit User" : "New User"}</div>
              <div className="um-card-subtitle">
                {isEdit
                  ? "Update details, then proceed to permissions"
                  : "Create account, then assign menu permissions"}
              </div>
            </div>
          </div>

          {/* ── Loading skeleton ── */}
          {isEdit && !loaded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 42, borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
              <div style={{ fontSize: 13, color: "#475569", textAlign: "center", marginTop: 4 }}>
                Loading user details…
              </div>
            </div>
          ) : (
            <>
              {apiError && <div className="gm-modal-error">{apiError}</div>}

              <form onSubmit={handleSubmit} autoComplete="off">

                {/* ── Username ── */}
                <div className="gm-field">
                  <label className="gm-label" htmlFor="uname">
                    Username <span className="gm-req">*</span>
                  </label>
                  <input
                    id="uname"
                    type="text"
                    className={`gm-input${errors.userName ? " error" : ""}`}
                    placeholder="Enter username"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    autoComplete="off"
                  />
                  {errors.userName && (
                    <div className="gm-field-err">{errors.userName}</div>
                  )}
                </div>

                {/* ── Password ── */}
                <PwField
                  id="pwd"
                  label={isEdit ? "Password" : "Password *"}
                  value={pwd}
                  onChange={setPwd}
                  error={errors.pwd}
                  placeholder={isEdit ? "Edit or leave as-is" : "Enter password"}
                />

                {/* ── Confirm Password ── */}
                <div className="gm-field">
                  <label className="gm-label" htmlFor="cpwd">
                    Confirm Password{" "}
                    {!isEdit && <span className="gm-req">*</span>}
                  </label>
                  <ConfirmPwField
                    value={confirm}
                    onChange={setConfirm}
                    error={errors.confirm}
                    match={pwMatch}
                  />
                </div>

                {/* ── Account Status ── */}
                <div className="gm-field">
                  <label className="gm-label">Account Status</label>
                  <div className="um-radio-group">
                    <label
                      className={`um-radio-label ${active === 1 ? "um-radio-label--active-sel" : ""}`}
                      onClick={() => setActive(1)}
                    >
                      <span className={`um-radio-circle ${active === 1 ? "um-radio-circle--active" : ""}`} />
                      Active
                    </label>
                    <label
                      className={`um-radio-label ${active === 0 ? "um-radio-label--inactive-sel" : ""}`}
                      onClick={() => setActive(0)}
                    >
                      <span className={`um-radio-circle ${active === 0 ? "um-radio-circle--inactive" : ""}`} />
                      Inactive
                    </label>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="um-form-actions">
                  <button
                    type="button"
                    className="gm-btn-cancel"
                    onClick={() => navigate("/user-management/users")}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="gm-btn-save um-submit-btn"
                    disabled={saving || !loaded}
                  >
                    {saving ? <span className="gm-spinner-sm" /> : <Save size={14} />}
                    {isEdit ? "Save & Edit Permissions" : "Create & Set Permissions"}
                  </button>
                </div>

              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}