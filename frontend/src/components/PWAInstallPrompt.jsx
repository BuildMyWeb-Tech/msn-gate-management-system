// components/PWAInstallPrompt.jsx
// Handles:
//   - Android / Chrome: beforeinstallprompt event → native install
//   - iOS / Safari:     manual "Add to Home Screen" instructions
//   - Windows / Edge:   native install via beforeinstallprompt
//   - Shows install banner at bottom of screen
//   - Persists dismissal in localStorage (re-shows after 7 days)

import React, { useEffect, useState } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

const DISMISS_KEY  = "gms_pwa_dismissed";
const DISMISS_DAYS = 7;

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function wasDismissedRecently() {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const diff = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24);
  return diff < DISMISS_DAYS;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferred] = useState(null);
  const [show, setShow]               = useState(false);
  const [isIos, setIsIos]             = useState(false);
  const [installing, setInstalling]   = useState(false);
  const [installed, setInstalled]     = useState(false);

  useEffect(() => {
    // Already installed as PWA — hide banner
    if (isInStandaloneMode()) return;
    // Dismissed recently — hide banner
    if (wasDismissedRecently()) return;

    const ios = isIOS();
    setIsIos(ios);

    if (ios) {
      // iOS: show manual instructions after 2s
      setTimeout(() => setShow(true), 2000);
      return;
    }

    // Android / Windows / Chrome / Edge: listen for install event
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShow(false);
      }
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop for iOS instructions */}
      {isIos && (
        <div
          onClick={handleDismiss}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 8000,
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      {/* Banner */}
      <div style={{
        position: "fixed",
        bottom: isIos ? "auto" : 20,
        top:    isIos ? "auto" : "auto",
        left:   isIos ? 16 : 16,
        right:  isIos ? 16 : 16,
        bottom: isIos ? 80 : 16,
        zIndex: 8001,
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
        margin: "0 auto",
        animation: "toastIn .3s ease",
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
          }}>
            <Smartphone size={22} color="#000" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Install MSN Gate Management</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
              {isIos
                ? "Add to Home Screen for the best experience"
                : "Install as an app — works offline, loads faster"}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4, borderRadius: 6, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* iOS instructions */}
        {isIos ? (
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10, fontWeight: 600 }}>
              Follow these steps:
            </div>
            {[
              { Icon: Share, text: 'Tap the Share button in Safari toolbar' },
              { Icon: Plus,  text: 'Scroll down and tap "Add to Home Screen"' },
              { Icon: Smartphone, text: 'Tap "Add" — the app icon will appear on your home screen' },
            ].map(({ Icon, text }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={14} style={{ color: "var(--accent)" }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--text)" }}>{text}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Android / Windows install button */
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleInstall}
              disabled={installing}
              style={{
                flex: 1, padding: "10px 16px",
                background: "var(--accent)", color: "#000",
                border: "none", borderRadius: 8,
                fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: installing ? "not-allowed" : "pointer",
                opacity: installing ? 0.7 : 1,
                transition: "all .15s",
              }}
            >
              {installing
                ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(0,0,0,.25)", borderTopColor: "#000", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" }} />Installing...</>
                : <><Download size={15} />Install App</>}
            </button>
            <button
              onClick={handleDismiss}
              style={{ padding: "10px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}
            >
              Not now
            </button>
          </div>
        )}

        {/* Arrow pointing down for iOS (points toward Safari toolbar) */}
        {isIos && (
          <div style={{ textAlign: "center", color: "var(--accent)", fontSize: 22, lineHeight: 1 }}>
            ▼
          </div>
        )}
      </div>
    </>
  );
}
