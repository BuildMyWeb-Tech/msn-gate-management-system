import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, getGates } from "../services/authService";
import { Shield, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  // companyCode is VarChar — default 514670 (MSN company)
  const [form, setForm]   = useState({ username: "", password: "", companyCode: "514670", gateId: "" });
  const [gates, setGates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    getGates("514670").then(r => { if (r.success) setGates(r.data || []); }).catch(() => {});
  }, []);

  const onChange = e => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(""); };

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.username.trim()) return setError("Username is required");
    if (!form.password)        return setError("Password is required");
    if (!form.gateId)          return setError("Please select a Gate");
    setLoading(true);
    try {
      const res = await loginUser({
        username:    form.username.trim(),
        password:    form.password,
        companyCode: String(form.companyCode),  // VarChar e.g. "514670"
        gateId:      Number(form.gateId),
      });
      if (res.success) {
        login(res.data);  // stores companyCode + companyId (Int from DB)
        navigate("/dashboard", { replace: true });
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Shield size={26} color="#000" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="login-brand-name">MSN Gate Management</div>
            <div className="login-brand-sub">Security Management System</div>
          </div>
        </div>

        <div className="login-section-label">Sign In</div>

        {error && (
          <div className="login-error">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Company Code</label>
            <input name="companyCode" type="text" className="form-input" value={form.companyCode} onChange={onChange} placeholder="Company Code" />
          </div>
          <div className="form-group">
            <label className="form-label">Username <span className="req">*</span></label>
            <input name="username" className="form-input" value={form.username} onChange={onChange} placeholder="Enter your username" autoCapitalize="none" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password <span className="req">*</span></label>
            <div className="pw-wrap">
              <input name="password" type={showPw ? "text" : "password"} className="form-input" value={form.password} onChange={onChange} placeholder="Enter your password" style={{ paddingRight: 42 }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Gate <span className="req">*</span></label>
            <select name="gateId" className="form-input" value={form.gateId} onChange={onChange}>
              <option value="">— Select Gate —</option>
              {gates.length > 0
                ? gates.map(g => <option key={g.id} value={g.id}>{g.name || g.code}</option>)
                : <option value="1">Gate 1 (Default)</option>}
            </select>
          </div>
          <button type="submit" className="login-submit" disabled={loading}>
            {loading
              ? <><span className="spin-sm" style={{ borderColor: "rgba(0,0,0,0.25)", borderTopColor: "#000" }} />Signing in...</>
              : <><LogIn size={16} />Sign In</>}
          </button>
        </form>
      </div>
    </div>
  );
}