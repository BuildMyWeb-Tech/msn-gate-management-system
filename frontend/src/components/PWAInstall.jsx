import React, { useState, useEffect } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";

export default function PWAInstall() {
  const { isMobile } = useResponsive();
  const [prompt, setPrompt]       = useState(null);  // beforeinstallprompt event
  const [show, setShow]           = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true); return;
    }
    // Check if user dismissed before (within 7 days)
    const d = localStorage.getItem("pwa-dismissed");
    if (d && Date.now() - Number(d) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true); return;
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Chrome/Android — listen for install prompt
    const handler = e => {
      e.preventDefault();
      setPrompt(e);
      // Show banner after 3 seconds on mobile
      if (isMobile) setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS — show manual instructions after delay
    if (ios && isMobile) setTimeout(() => setShow(true), 3000);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isMobile]);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") { setIsInstalled(true); setShow(false); }
    else dismiss();
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", String(Date.now()));
  };

  // Don't show on desktop or if installed/dismissed
  if (!isMobile || isInstalled || dismissed || !show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 74, left: 12, right: 12, zIndex: 350,
      background: "var(--surface)",
      border: "1px solid var(--accent)",
      borderRadius: "var(--radius)",
      padding: "14px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      animation: "slideUp .3s ease",
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg,#f59e0b,#d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src="/icons/icon-96.png" alt="MSN Gate"
            style={{ width:36, height:36, borderRadius:8 }}
            onError={e => e.target.style.display="none"}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>
            Install MSN Gate App
          </div>
          <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.4 }}>
            {isIOS
              ? <>Tap <Share size={12} style={{verticalAlign:"middle"}}/> then "Add to Home Screen" to install</>
              : "Add to home screen for faster access, works offline"}
          </div>
        </div>
        <button onClick={dismiss} style={{
          background:"none", border:"none",
          color:"var(--text3)", cursor:"pointer", padding:4, flexShrink:0,
        }}><X size={16}/></button>
      </div>

      {!isIOS && prompt && (
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleInstall} className="btn btn-primary btn-sm" style={{ flex:1 }}>
            <Download size={14}/> Install App
          </button>
          <button onClick={dismiss} className="btn btn-ghost btn-sm">
            Not now
          </button>
        </div>
      )}

      {isIOS && (
        <div style={{
          marginTop:10, padding:"8px 12px",
          background:"var(--surface2)", borderRadius:"var(--radius-sm)",
          fontSize:12, color:"var(--text2)",
          display:"flex", alignItems:"center", gap:8,
        }}>
          <Share size={14} style={{ color:"var(--accent)", flexShrink:0 }}/>
          <span>Tap Share → <strong>Add to Home Screen</strong> → <Plus size={11}/> Add</span>
        </div>
      )}
    </div>
  );
}
