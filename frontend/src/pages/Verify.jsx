// src/pages/Verify.jsx
// ─────────────────────────────────────────────
//  Email Verification Page
//  OTP entry + company code confirmation
// ─────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyCompany, resendVerification } from '../services/authService';

// ─── OTP Input Component ──────────────────────────────────────────────────────
const OTPInput = ({ value, onChange, hasError }) => {
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);
  const inputRefs = useRef([]);

  const handleDigitChange = (index, e) => {
    const char = e.target.value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join('');
    onChange(newValue);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6).trimEnd());
    if (pasted.length > 0) {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="otp-input-row">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleDigitChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`otp-digit ${d ? 'filled' : ''} ${hasError ? 'error' : ''}`}
          style={{ borderColor: hasError ? 'var(--error)' : undefined }}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

// ─── Resend Countdown ─────────────────────────────────────────────────────────
const ResendButton = ({ companyCode }) => {
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (!companyCode || countdown > 0) return;
    setIsSending(true);
    setMessage('');
    try {
      await resendVerification({ companyCode });
      setMessage('New code sent!');
      setCountdown(60);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to resend.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div style={{ textAlign: 'center', marginTop: 12 }}>
      {message && (
        <p style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: message.includes('sent') ? 'var(--teal)' : 'var(--error)',
          marginBottom: 6,
        }}>
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={handleResend}
        disabled={countdown > 0 || isSending}
        style={{
          background: 'none',
          border: 'none',
          cursor: countdown > 0 || isSending ? 'default' : 'pointer',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          color: countdown > 0 || isSending ? 'var(--text-muted)' : 'var(--teal)',
          padding: 0,
          transition: 'var(--transition)',
        }}
      >
        {isSending
          ? 'Sending...'
          : countdown > 0
          ? `Resend in ${countdown}s`
          : 'Resend verification code'}
      </button>
    </div>
  );
};

// ─── Main Verify Page ─────────────────────────────────────────────────────────
const Verify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [companyCode, setCompanyCode] = useState(
    searchParams.get('code') || ''
  );
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyCode.trim()) {
      setError('Please enter your company code.');
      return;
    }
    if (otp.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyCompany({
        companyCode: companyCode.trim().toUpperCase(),
        verificationCode: otp,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Success State ────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 36 }}>
            <div className="auth-logo-icon">🖨️</div>
            <span className="auth-logo-text">PrintMixBox</span>
          </div>

          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--success-bg)',
            border: '2px solid var(--teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            margin: '0 auto 24px',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            ✓
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Account Verified!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-mono)', marginBottom: 28 }}>
            Your company is now active. You can log in.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  // ─── Verify Form ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🖨️</div>
          <span className="auth-logo-text">PrintMixBox</span>
        </div>

        {/* Steps */}
        <div className="step-indicator">
          <div className="step done">
            <div className="step-dot">✓</div>
            <span className="step-label">Register</span>
          </div>
          <div className="step-line" />
          <div className="step active">
            <div className="step-dot">2</div>
            <span className="step-label">Verify</span>
          </div>
          <div className="step-line" />
          <div className="step">
            <div className="step-dot">3</div>
            <span className="step-label">Login</span>
          </div>
        </div>

        <div className="auth-card-header" style={{ marginBottom: 24 }}>
          <h1 className="auth-title">Verify your email</h1>
          <p className="auth-subtitle">// Enter the 6-digit code from your inbox</p>
        </div>

        {error && (
          <div className="alert alert-error">⚠ {error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Company Code */}
          <div className="form-group">
            <label className="form-label">Company Code</label>
            <input
              type="text"
              className="form-input form-input-mono"
              placeholder="COMP-4829"
              value={companyCode}
              onChange={(e) => {
                setCompanyCode(e.target.value.toUpperCase());
                setError('');
              }}
              maxLength={9}
            />
          </div>

          {/* OTP */}
          <div className="form-group">
            <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
              Verification Code
            </label>
            <OTPInput
              value={otp}
              onChange={(val) => { setOtp(val); setError(''); }}
              hasError={!!error}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || otp.length < 6}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" />
                Verifying...
              </>
            ) : (
              'Verify Account'
            )}
          </button>
        </form>

        <ResendButton companyCode={companyCode} />

        <div className="auth-divider">
          <span className="auth-divider-text">options</span>
        </div>

        <div className="auth-footer">
          <Link to="/register" className="auth-link">Register new company</Link>
          {' '}·{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Verify;
