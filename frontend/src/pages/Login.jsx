// src/pages/Login.jsx
// Logo image: place your logo PNG at  frontend/public/brand/logo.png
// It will be served at URL: /brand/logo.png

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, isAuthenticated } = useAuth();

  const [form, setForm]       = useState({ username: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [serverError, setServer] = useState('');
  const [sessionMsg, setSession] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (params.get('reason') === 'session_expired')
      setSession('Your session expired. Please sign in again.');
  }, [params]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (serverError)  setServer('');
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.password)        e.password = 'Password is required';
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServer('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await loginUser({ username: form.username.trim(), password: form.password });
      if (res.success) {
        login({ userId: res.data.userId, username: form.username.trim() });
        navigate('/dashboard', { replace: true });
      } else {
        setServer('Invalid username or password.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.';
      setServer(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">

      {/* ── Left brand panel ── */}
      <div className="login-brand">
        <div className="login-brand-inner">

          {/* Logo: image first, SVG fallback if image missing */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <img
                src="/brand/logo.png"
                alt="Mr. Press Management"
                className="login-logo-img"
                onError={e => {
                  // Fallback to SVG icon if logo.png not found
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'block';
                }}
              />
              {/* SVG fallback (hidden by default, shown if logo.png missing) */}
              <svg
                width="28" height="28" viewBox="0 0 28 28" fill="none"
                style={{ display: 'none' }}
              >
                <rect width="28" height="28" rx="6" fill="white" fillOpacity="0.15"/>
                <path d="M7 8h14M7 14h10M7 20h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="login-logo-text">Mr. Press Management</span>
          </div>

          <div className="login-brand-content">
            <h1 className="login-brand-headline">
              Streamline your<br />
              <span>press operations</span>
            </h1>
            <p className="login-brand-desc">
              Manage job cards, process planning, pre-press to post-press
              workflows, and logistics — all in one platform.
            </p>
          </div>

          <div className="login-brand-features">
            {[
              { icon: '🖨️', label: 'Press & Pre-Press Management' },
              { icon: '📋', label: 'Job Card & Process Planning' },
              { icon: '🚚', label: 'Courier Booking & Tracking' },
              { icon: '👥', label: 'User & Department Control' },
            ].map(f => (
              <div className="login-feature-item" key={f.label}>
                <span className="login-feature-icon">{f.icon}</span>
                <span className="login-feature-label">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-card">

          {/* Mobile logo — shown only on small screens via CSS */}
          <div className="login-mobile-logo">
            <div className="login-logo-icon-sm">
              <img
                src="/brand/logo.png"
                alt="Mr. Press"
                className="login-logo-img-sm"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'block';
                }}
              />
              <svg
                width="20" height="20" viewBox="0 0 28 28" fill="none"
                style={{ display: 'none' }}
              >
                <path d="M7 8h14M7 14h10M7 20h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span>Mr. Press Management</span>
          </div>

          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {sessionMsg && (
            <div className="login-alert login-alert-info">
              <span>🕐</span> {sessionMsg}
            </div>
          )}
          {serverError && (
            <div className="login-alert login-alert-error">
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate autoComplete="on">
            <div className="login-field">
              <label className="login-label">Username</label>
              <input
                type="text"
                name="username"
                className={`login-input ${errors.username ? 'error' : ''}`}
                placeholder="Enter your username"
                value={form.username}
                onChange={onChange}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                autoFocus
              />
              {errors.username && <div className="login-field-error">{errors.username}</div>}
            </div>

            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  className={`login-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={onChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <div className="login-field-error">{errors.password}</div>}
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="login-btn-spinner" />Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="login-footer-note">
            Mr. Press Management System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}