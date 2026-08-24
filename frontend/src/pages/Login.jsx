import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { loginUser, loginSecurity, getGates } from "../services/authService";
import { Eye, EyeOff, LogIn, AlertCircle, Smartphone, Monitor, Shield, UserCog } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { isMobile } = useResponsive();

  // Mobile users can choose: Security Guard or Admin
  const [mobileRole, setMobileRole] = useState("security"); // "security" | "admin"

  const [form, setForm] = useState({
    username:"", password:"", companyCode:"514670", gateId:"", gateName:"",
  });
  const [gates, setGates]         = useState([]);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [gatesLoading, setGatesLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace:true });
  }, [isAuthenticated, navigate]);

  // Load gates for security mobile login
  useEffect(() => {
    if (!isMobile || mobileRole !== "security") return;
    setGatesLoading(true);
    getGates("514670")
      .then(r => { if (r.success && r.data?.length) setGates(r.data); })
      .catch(() => {})
      .finally(() => setGatesLoading(false));
  }, [isMobile, mobileRole]);

  const onChange = e => {
    setError("");
    if (e.target.name === "gateId") {
      const sel = gates.find(g => String(g.id) === e.target.value);
      setForm(p => ({ ...p, gateId:e.target.value, gateName:sel?.name||"" }));
    } else {
      setForm(p => ({ ...p, [e.target.name]:e.target.value }));
    }
  };

  // Determine which SP to use
  // Desktop: always desktop SP
  // Mobile + security role: mobile SP (PR_AppValidate_SecurityLogin)
  // Mobile + admin role: desktop SP (PR_Validate_UserLogin) — full access on mobile
  const isMobileSecurity = isMobile && mobileRole === "security";
  const useMobileSP      = isMobileSecurity;

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.username.trim()) return setError("Username is required");
    if (!form.password)        return setError("Password is required");
    if (isMobileSecurity && !form.gateId) return setError("Please select a Gate");

    setLoading(true);
    try {
      let res;

      if (useMobileSP) {
        // Security guard login
        res = await loginSecurity({
          username:    form.username.trim(),
          password:    form.password,
          companyCode: form.companyCode,
          gateId:      Number(form.gateId),
          gateName:    form.gateName,
        });
      } else {
        // Desktop or mobile-admin login — use desktop SP
        res = await loginUser({
          username:    form.username.trim(),
          password:    form.password,
          companyCode: form.companyCode,
        });
      }

      if (res.success) {
        // For mobile admin — override loginType to "mobile" so mobile layout applies
        // but keep desktop menus (fetched via MenuContext using userId)
        if (isMobile && mobileRole === "admin") {
          res.data.loginType  = "desktop"; // use desktop menus from PR_Get_UserMenus
          res.data.gateId     = null;
          res.data.gateName   = null;
          res.data.mobileMenus = null;
        }
        login(res.data);
        navigate("/dashboard", { replace:true });
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch(err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-brand">
          <img src="/msn-logo.png" alt="MSN Infotec"
            style={{ width:200, height:"auto", marginBottom:6 }}
            onError={e => e.target.style.display="none"}/>
          <div style={{ fontSize:11, color:"var(--text3)", marginTop:4, textAlign:"center" }}>
            Gate Management System
          </div>
        </div>

        {/* Mobile role selector */}
        {isMobile && (
          <div style={{
            display:"flex", gap:0, marginBottom:20,
            border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", overflow:"hidden",
          }}>
            <button type="button" onClick={() => { setMobileRole("security"); setError(""); }}
              style={{
                flex:1, padding:"10px 8px", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:600,
                background: mobileRole==="security" ? "var(--accent)" : "none",
                color: mobileRole==="security" ? "#000" : "var(--text2)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                transition:"all .15s",
              }}>
              <Shield size={14}/> Security Guard
            </button>
            <button type="button" onClick={() => { setMobileRole("admin"); setError(""); }}
              style={{
                flex:1, padding:"10px 8px", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:600,
                background: mobileRole==="admin" ? "var(--accent)" : "none",
                color: mobileRole==="admin" ? "#000" : "var(--text2)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                transition:"all .15s",
              }}>
              <UserCog size={14}/> Admin / Staff
            </button>
          </div>
        )}

        {error && (
          <div className="login-error">
            <AlertCircle size={15} style={{ flexShrink:0 }}/>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Company Code</label>
            <input name="companyCode" className="form-input"
              value={form.companyCode} onChange={onChange}/>
          </div>

          <div className="form-group">
            <label className="form-label">
              {isMobileSecurity ? "Security ID" : "Username"} <span className="req">*</span>
            </label>
            <input name="username" className="form-input"
              value={form.username} onChange={onChange}
              placeholder={isMobileSecurity ? "e.g. S001" : "Username"}
              autoCapitalize="none" autoFocus/>
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="req">*</span></label>
            <div className="pw-wrap">
              <input name="password" type={showPw?"text":"password"} className="form-input"
                value={form.password} onChange={onChange} placeholder="Password"
                style={{ paddingRight:42 }}/>
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s=>!s)}>
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* Gate selector — security guard only */}
          {isMobileSecurity && (
            <div className="form-group">
              <label className="form-label">Gate <span className="req">*</span></label>
              {gatesLoading ? (
                <div className="form-input" style={{ color:"var(--text3)", display:"flex", alignItems:"center", gap:8 }}>
                  <span className="spin-sm"/>Loading gates...
                </div>
              ) : (
                <select name="gateId" className="form-input" value={form.gateId} onChange={onChange}>
                  <option value="">— Select Gate —</option>
                  {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading
              ? <><span className="spin-sm"/>Signing in...</>
              : <><LogIn size={16}/>
                {!isMobile ? "Sign In" : mobileRole==="security" ? "Sign In as Security" : "Sign In as Admin"}
                </>}
          </button>
        </form>

        <div style={{ marginTop:12, textAlign:"center", fontSize:11, color:"var(--text3)", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
          {!isMobile
            ? <><Monitor size={11}/> Desktop — Full management console</>
            : mobileRole==="security"
              ? <><Shield size={11}/> Security Guard — Visitor &amp; Vehicle entry</>
              : <><UserCog size={11}/> Admin — Full access on mobile</>}
        </div>
      </div>
    </div>
  );
}