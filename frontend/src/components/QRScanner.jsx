import React, { useEffect, useRef, useState } from "react";
import { X, QrCode } from "lucide-react";

export default function QRScanner({ onScan, onClose }) {
  const [error,setError] = useState("");
  const [ready,setReady] = useState(false);
  const html5Ref = useRef(null);

  useEffect(() => {
    const init = () => {
      try {
        const qr = new window.Html5Qrcode("qr-reader-div");
        html5Ref.current = qr;
        qr.start(
          { facingMode:"environment" },
          { fps:10, qrbox:{ width:250, height:250 } },
          (text) => {
            qr.stop().catch(()=>{});
            onScan(text.trim());
            onClose();
          },
          () => {}
        ).then(()=>setReady(true)).catch(e=>setError("Camera: "+e));
      } catch(e) { setError("Init error: "+e.message); }
    };

    if (window.Html5Qrcode) { init(); return; }
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";
    s.onload=init;
    s.onerror=()=>setError("Failed to load QR library");
    document.head.appendChild(s);

    return ()=>{ html5Ref.current?.stop().catch(()=>{}); };
  }, []);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"var(--surface)",borderRadius:"var(--radius)",border:"1px solid var(--border)",width:"min(380px,90vw)",overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}><QrCode size={16} style={{color:"var(--accent)"}}/>Scan Vehicle QR</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}><X size={18}/></button>
        </div>
        {error?(
          <div style={{padding:24,textAlign:"center",color:"var(--red)"}}>
            <p style={{marginBottom:12}}>{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        ):(
          <>
            <div id="qr-reader-div" style={{width:"100%"}}/>
            {!ready&&<div style={{padding:16,textAlign:"center",color:"var(--text3)",fontSize:13}}>Starting camera...</div>}
            <div style={{padding:"10px 16px",background:"var(--surface2)",fontSize:12,color:"var(--text3)",textAlign:"center"}}>
              Point at QR code — auto-fills vehicle number
            </div>
          </>
        )}
      </div>
    </div>
  );
}