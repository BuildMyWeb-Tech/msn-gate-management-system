import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { loginUser, loginSecurity, getGates, getCompanyByShortname } from "../services/authService";
import { Eye, EyeOff, LogIn, AlertCircle, Monitor, Shield, UserCog, ChevronRight, Building2 } from "lucide-react";

// Company list — shortname is the @cname value passed to PRW_GetDBDetails SP
const COMPANIES = [
  { label: "KRG Power Solar",  shortname: "KRGSolor" },
  { label: "INDO TEXNOLOGY",   shortname: "Amman1"   },
  { label: "Suriya SPinners",  shortname: "Amman2"   },
  { label: "Om Textiles",      shortname: "omtex"    },
  { label: "KRG SOLAR",        shortname: "krg"      },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { isMobile } = useResponsive();

  const [mobileRole, setMobileRole] = useState("security");

  const [form, setForm] = useState({
    username:"", password:"", companyCode:"514670", gateId:"", gateName:"",
  });
  const [gates, setGates]               = useState([]);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPw, setShowPw]             = useState(false);
  const [gatesLoading, setGatesLoading] = useState(false);
  const [companyName, setCompanyName]   = useState("");
  const [companyResolved, setCompanyResolved] = useState(false);

  // Company search step (shown when no ?company= param in URL)
  const [companySearch, setCompanySearch]       = useState("");
  const [companySearching, setCompanySearching] = useState(false);
  const [companySearchError, setCompanySearchError] = useState("");
  const [showCompanySearch, setShowCompanySearch]   = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace:true });
  }, [isAuthenticated, navigate]);

  // Resolve company from ?company= URL param
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const shortname = params.get("company");
    if (!shortname) {
      // No company in URL — show search step
      setShowCompanySearch(true);
      return;
    }
    getCompanyByShortname(shortname)
      .then(r => {
        if (r.success && r.data) {
          if (r.data.companyCode) setForm(p => ({ ...p, companyCode: r.data.companyCode }));
          setCompanyName(r.data.companyName || shortname);
          setCompanyResolved(true);
          setShowCompanySearch(false);
        } else {
          setShowCompanySearch(true);
        }
      })
      .catch(() => setShowCompanySearch(true));
  }, []);

  const handleSelectCompany = async (company) => {
    setCompanySearching(true);
    setCompanySearchError("");
    setCompanySearch(company.label);
    try {
      const r = await getCompanyByShortname(company.shortname);
      if (r.success && r.data) {
        if (r.data.companyCode) setForm(p => ({ ...p, companyCode: r.data.companyCode }));
        setCompanyName(r.data.companyName || company.label);
        setCompanyResolved(true);
        setShowCompanySearch(false);
      } else {
        // Fallback: use known shortname as companyCode directly
        setForm(p => ({ ...p, companyCode: company.shortname }));
        setCompanyName(company.label);
        setCompanyResolved(true);
        setShowCompanySearch(false);
      }
    } catch {
      setForm(p => ({ ...p, companyCode: company.shortname }));
      setCompanyName(company.label);
      setCompanyResolved(true);
      setShowCompanySearch(false);
    } finally {
      setCompanySearching(false);
    }
  };

  // Load gates for security mobile login
  useEffect(() => {
    if (!isMobile || mobileRole !== "security") return;
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
        // SP bug workaround: SP may return success=true but userId=0 for bad credentials
        if (!res.data?.userId) {
          setError("Invalid credentials — check your Security ID and password.");
          return;
        }

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

        {/* Company selection step */}
        {showCompanySearch && (
          <div>
            <div style={{ marginBottom:14, fontSize:13, color:"var(--text2)", textAlign:"center" }}>
              Select your company to continue
            </div>
            {companySearchError && (
              <div className="login-error" style={{ marginBottom:12 }}>
                <AlertCircle size={15} style={{ flexShrink:0 }}/>
                <span>{companySearchError}</span>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {COMPANIES.map(c => (
                <button
                  key={c.shortname}
                  type="button"
                  onClick={() => handleSelectCompany(c)}
                  disabled={companySearching}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"12px 14px", border:"1px solid var(--border)",
                    borderRadius:"var(--radius-sm)", background:"var(--surface2)",
                    color:"var(--text1)", cursor:"pointer", fontSize:13, fontWeight:500,
                    transition:"all .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="var(--accent)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}
                >
                  <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Building2 size={15} style={{ color:"var(--text3)", flexShrink:0 }}/>
                    {companySearching && companySearch === c.label
                      ? <span style={{ color:"var(--text3)" }}>Loading...</span>
                      : c.label}
                  </span>
                  <ChevronRight size={15} style={{ color:"var(--text3)" }}/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Login form — shown after company resolved */}
        {!showCompanySearch && <>

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
          {companyResolved ? (
            <div className="form-group">
              <label className="form-label">Company</label>
              <div className="form-input" style={{ color:"var(--text1)", background:"var(--surface2)", cursor:"default" }}>
                {companyName}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Company Code</label>
              <input name="companyCode" className="form-input"
                value={form.companyCode} onChange={onChange}/>
            </div>
          )}

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

        </>}
      </div>
    </div>
  );
}