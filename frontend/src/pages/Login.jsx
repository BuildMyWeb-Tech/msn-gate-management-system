import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { loginUser, loginSecurity, getGates } from "../services/authService";
import { Eye, EyeOff, AlertCircle, Shield, UserCog, ChevronRight, Building2, ArrowRight, LogIn, Users, Car, ClipboardList } from "lucide-react";

const RED = "#c0392b";
const RED_DARK = "#a93226";

const COMPANIES = [
  { label: "KRG Power Solar",  companyCode: "5146703" },
  { label: "INDO TEXNOLOGY",   companyCode: "5146679" },
  { label: "Suriya SPinners",  companyCode: "5146681" },
  { label: "Om Textiles",      companyCode: "5146635" },
  { label: "KRG SOLAR",        companyCode: "5146672" },
];

/* ── Shared page wrapper — white bg, full viewport ─────────── */
const pageStyle = {
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
};

/* ── Input field style ──────────────────────────────────────── */
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "12px 14px", border: "1.5px solid #e0e0e0",
  borderRadius: 8, fontSize: 14, outline: "none",
  background: "#fafafa", color: "#222",
  transition: "border-color .15s",
};

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { isMobile } = useResponsive();

  const [mobileRole, setMobileRole] = useState("security");
  const [form, setForm] = useState({ username: "", password: "", companyCode: "514670", gateId: "", gateName: "" });
  const [gates, setGates]               = useState([]);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPw, setShowPw]             = useState(false);
  const [gatesLoading, setGatesLoading] = useState(false);
  const [companyName, setCompanyName]   = useState("");
  const [companyResolved, setCompanyResolved] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param  = params.get("company");
    if (!param) { setShowCompanySearch(true); return; }
    const match = COMPANIES.find(c =>
      c.label.toLowerCase() === param.toLowerCase() || c.companyCode === param
    );
    if (match) {
      setForm(p => ({ ...p, companyCode: match.companyCode }));
      setCompanyName(match.label);
      setCompanyResolved(true);
    } else {
      setShowCompanySearch(true);
    }
  }, []);

  const handleSelectCompany = (company) => {
    setForm(p => ({ ...p, companyCode: company.companyCode }));
    setCompanyName(company.label);
    setCompanyResolved(true);
    setShowCompanySearch(false);
  };

  useEffect(() => {
    if (!isMobile || mobileRole !== "security" || !form.companyCode) return;
    setGatesLoading(true);
    getGates(form.companyCode)
      .then(r => { if (r.success && r.data?.length) setGates(r.data); })
      .catch(() => {})
      .finally(() => setGatesLoading(false));
  }, [isMobile, mobileRole, form.companyCode]);

  const onChange = e => {
    setError("");
    if (e.target.name === "gateId") {
      const sel = gates.find(g => String(g.id) === e.target.value);
      setForm(p => ({ ...p, gateId: e.target.value, gateName: sel?.name || "" }));
    } else {
      setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    }
  };

  const isMobileSecurity = isMobile && mobileRole === "security";

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.username.trim()) return setError("Username is required");
    if (!form.password)        return setError("Password is required");
    if (isMobileSecurity && !form.gateId) return setError("Please select a Gate");

    setLoading(true);
    try {
      let res;
      if (isMobileSecurity) {
        res = await loginSecurity({ username: form.username.trim(), password: form.password, companyCode: form.companyCode, gateId: Number(form.gateId), gateName: form.gateName });
      } else {
        res = await loginUser({ username: form.username.trim(), password: form.password, companyCode: form.companyCode });
      }

      if (res.success) {
        if (!res.data?.userId) { setError("Invalid credentials — check your username and password."); return; }
        if (isMobile && mobileRole === "admin") {
          res.data.loginType   = "desktop";
          res.data.gateId      = null;
          res.data.gateName    = null;
          res.data.mobileMenus = null;
        }
        login(res.data);
        navigate("/dashboard", { replace: true });
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally { setLoading(false); }
  };

  /* ── Company selection screen ───────────────────────────── */
  if (showCompanySearch) {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 480, padding: "0 16px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img src="/msn-logo.png" alt="MSN Infotec"
              style={{ height: 48, width: "auto" }}
              onError={e => e.target.style.display = "none"} />
            <div style={{ fontSize: 22, fontWeight: 700, color: "#222", marginTop: 8 }}>MSN Gate</div>
            <div style={{ fontSize: 13, color: "#888" }}>Gate Management System</div>
          </div>

          {/* Card */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#222" }}>Find Your Company</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "#888" }}>Select your company to access the login page</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {COMPANIES.map(c => (
                <button key={c.companyCode} type="button" onClick={() => handleSelectCompany(c)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", border: "1.5px solid #e8e8e8", borderRadius: 10,
                    background: "#fff", color: "#222", cursor: "pointer",
                    fontSize: 14, fontWeight: 500, textAlign: "left", transition: "all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.background = "#fdf5f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8e8"; e.currentTarget.style.background = "#fff"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "#fff0ef", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Building2 size={16} style={{ color: RED }} />
                    </span>
                    {c.label}
                  </span>
                  <ChevronRight size={16} style={{ color: "#bbb" }} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#aaa" }}>
            MSN Infotec © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    );
  }

  /* ── Login screen — split layout ───────────────────────── */
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#fff", fontFamily: "inherit" }}>

      {/* Left red panel — hidden on small mobile */}
      {!isMobile && (
        <div style={{
          width: "45%", minHeight: "100vh", background: RED,
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "48px 40px", boxSizing: "border-box", color: "#fff",
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 48 }}>
            <img src="/msn-logo.png" alt="MSN Infotec"
              style={{ height: 40, width: "auto", filter: "brightness(0) invert(1)" }}
              onError={e => e.target.style.display = "none"} />
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, opacity: .7, marginBottom: 8, textTransform: "uppercase" }}>
            MSN Gate
          </div>
          <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
            Streamline your<br />
            <span style={{ color: "#ffcdd2" }}>gate operations</span>
          </h1>
          <p style={{ margin: "0 0 40px", fontSize: 14, opacity: .8, lineHeight: 1.6 }}>
            Manage visitors, vehicles, and security patrols — all in one platform.
          </p>

          {/* Feature highlights */}
          {[
            { icon: <Users size={18} />,        text: "Visitor Management" },
            { icon: <Car size={18} />,           text: "Vehicle Tracking" },
            { icon: <ClipboardList size={18} />, text: "Security Patrol" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {f.icon}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Right white panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "32px 20px" : "48px 48px",
        background: "#fff", overflowY: "auto",
      }}>

        {/* Mobile logo */}
        {isMobile && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/msn-logo.png" alt="MSN Infotec"
              style={{ height: 40, width: "auto" }}
              onError={e => e.target.style.display = "none"} />
            <div style={{ fontSize: 18, fontWeight: 700, color: "#222", marginTop: 6 }}>MSN Gate</div>
          </div>
        )}

        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#1a1a1a" }}>Welcome back</h2>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#888" }}>Sign in to your account to continue</p>

          {/* Company badge */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: "#fff0ef", color: RED, fontSize: 13, fontWeight: 600,
            }}>
              <Building2 size={13} />
              {companyName}
            </span>
            <button type="button" onClick={() => { setShowCompanySearch(true); setCompanyResolved(false); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#aaa", padding: "4px 6px" }}>
              Change
            </button>
          </div>

          {/* Mobile role selector */}
          {isMobile && (
            <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1.5px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
              {[{ role: "security", icon: <Shield size={13} />, label: "Security Guard" },
                { role: "admin",    icon: <UserCog size={13} />, label: "Admin / Staff" }].map(r => (
                <button key={r.role} type="button" onClick={() => { setMobileRole(r.role); setError(""); }}
                  style={{
                    flex: 1, padding: "10px 8px", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6, transition: "all .15s",
                    background: mobileRole === r.role ? RED : "#fff",
                    color: mobileRole === r.role ? "#fff" : "#666",
                  }}>
                  {r.icon}{r.label}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8,
              color: "#c0392b", fontSize: 13, marginBottom: 16,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} noValidate>
            {/* Username */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>
                {isMobileSecurity ? "Security ID" : "User Name"} <span style={{ color: RED }}>*</span>
              </label>
              <input name="username" value={form.username} onChange={onChange}
                placeholder={isMobileSecurity ? "e.g. S001" : "Enter user name"}
                autoCapitalize="none" autoFocus
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField("")}
                style={{ ...inputStyle, borderColor: focusedField === "username" ? RED : "#e0e0e0" }} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>
                Password <span style={{ color: RED }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input name="password" type={showPw ? "text" : "password"} value={form.password} onChange={onChange}
                  placeholder="Enter password"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField("")}
                  style={{ ...inputStyle, borderColor: focusedField === "password" ? RED : "#e0e0e0", paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 4 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Gate selector — security only */}
            {isMobileSecurity && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>
                  Gate <span style={{ color: RED }}>*</span>
                </label>
                {gatesLoading ? (
                  <div style={{ ...inputStyle, color: "#aaa", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="spin-sm" />Loading gates...
                  </div>
                ) : (
                  <select name="gateId" value={form.gateId} onChange={onChange}
                    onFocus={() => setFocusedField("gate")}
                    onBlur={() => setFocusedField("")}
                    style={{ ...inputStyle, borderColor: focusedField === "gate" ? RED : "#e0e0e0" }}>
                    <option value="">— Select Gate —</option>
                    {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px 20px", marginTop: 8,
                background: loading ? "#e8a09a" : RED, color: "#fff",
                border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background .15s",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = RED_DARK; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = RED; }}
            >
              {loading
                ? <><span className="spin-sm" />Signing in...</>
                : <>{!isMobile ? "Sign In" : mobileRole === "security" ? "Sign In as Security" : "Sign In as Admin"} <ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: "center", fontSize: 12, color: "#ccc" }}>
            MSN Infotec © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
