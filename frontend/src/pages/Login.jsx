import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { loginUser, loginSecurity, getGates } from "../services/authService";
import { Eye, EyeOff, LogIn, AlertCircle, Smartphone, Monitor } from "lucide-react";

export default function Login() {
  const navigate  = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { isMobile } = useResponsive();

  const [form, setForm]     = useState({
    username:"", password:"", companyCode:"514670", gateId:"", gateName:"",
  });
  const [gates, setGates]   = useState([]);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [gatesLoading, setGatesLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace:true });
  }, [isAuthenticated, navigate]);

  // Load gates for mobile login
  useEffect(() => {
    if (!isMobile) return;
    setGatesLoading(true);
    getGates("514670")
      .then(r => { if (r.success && r.data?.length) setGates(r.data); })
      .catch(() => {})
      .finally(() => setGatesLoading(false));
  }, [isMobile]);

  const onChange = e => {
    setError("");
    if (e.target.name === "gateId") {
      const sel = gates.find(g => String(g.id) === e.target.value);
      setForm(p => ({ ...p, gateId: e.target.value, gateName: sel?.name || "" }));
    } else {
      setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    }
  };

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.username.trim()) return setError("Username is required");
    if (!form.password)        return setError("Password is required");
    if (isMobile && !form.gateId) return setError("Please select a Gate");
    setLoading(true);
    try {
      let res;
      if (isMobile) {
        // Mobile: use PR_AppValidate_SecurityLogin
        res = await loginSecurity({
          username:    form.username.trim(),
          password:    form.password,
          companyCode: form.companyCode,
          gateId:      Number(form.gateId),
          gateName:    form.gateName,
        });
      } else {
        // Desktop: use PR_Validate_UserLogin
        res = await loginUser({
          username:    form.username.trim(),
          password:    form.password,
          companyCode: form.companyCode,
        });
      }
      if (res.success) {
        login(res.data);
        navigate("/dashboard", { replace:true });
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch(err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-brand">
          <img src="/logo.svg" alt="MSN Infotec Gate Management"
            style={{ width:200, height:"auto", marginBottom:6 }}
            onError={e => { e.target.style.display="none"; }}/>
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            fontSize:11, color:"var(--text3)", marginTop:4,
          }}>
            {isMobile
              ? <><Smartphone size={12}/> Security Guard Login</>
              : <><Monitor size={12}/> Admin / Staff Login</>}
          </div>
        </div>

        <div className="login-section-label">Sign In</div>

        {error && (
          <div className="login-error">
            <AlertCircle size={15} style={{ flexShrink:0 }}/>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Company Code</label>
            <input name="companyCode" className="form-input"
              value={form.companyCode} onChange={onChange}/>
          </div>
          <div className="form-group">
            <label className="form-label">Username <span className="req">*</span></label>
            <input name="username" className="form-input"
              value={form.username} onChange={onChange}
              placeholder={isMobile ? "Security ID (e.g. S001)" : "Username"}
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

          {/* Gate selector — mobile only */}
          {isMobile && (
            <div className="form-group">
              <label className="form-label">Gate <span className="req">*</span></label>
              {gatesLoading ? (
                <div className="form-input" style={{ color:"var(--text3)", display:"flex", alignItems:"center", gap:8 }}>
                  <span className="spin-sm" style={{ borderColor:"var(--border2)", borderTopColor:"var(--accent)" }}/>
                  Loading gates...
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
              ? <><span className="spin-sm" style={{ borderColor:"rgba(0,0,0,0.25)", borderTopColor:"#000" }}/>Signing in...</>
              : <><LogIn size={16}/>{isMobile ? "Sign In as Security" : "Sign In"}</>}
          </button>
        </form>

        {/* Device indicator */}
        <div style={{
          marginTop:16, textAlign:"center",
          fontSize:11, color:"var(--text3)",
          display:"flex", alignItems:"center", justifyContent:"center", gap:4,
        }}>
          {isMobile
            ? <><Smartphone size={11}/> Mobile access — Visitor & Vehicle entry</>
            : <><Monitor size={11}/> Desktop access — Full management console</>}
        </div>
      </div>
    </div>
  );
}
