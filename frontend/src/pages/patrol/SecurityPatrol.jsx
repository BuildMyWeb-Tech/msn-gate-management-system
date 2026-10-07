import React, { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  getPatrolSessions, createPatrolSession, endPatrolSession,
  getSessionCheckpoints, validatePatrolPoint, logSessionCheckpoint,
} from "../../services/patrolService";
import Toast from "../../components/Toast";
import { Shield, Camera, MapPin, RefreshCw, ChevronLeft, Loader, Eye, UserCheck, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

// Load face-api models once (lazy, on first need)
let faceModelsLoaded = false;

// Face verification is required only the first time "New" is clicked per page session.
// Persists across component remounts (navigating away and back) but resets on page reload.
let faceVerifiedThisSession = false;
async function loadFaceModels() {
  if (faceModelsLoaded) return;
  const base = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(base),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(base),
    faceapi.nets.faceRecognitionNet.loadFromUri(base),
  ]);
  faceModelsLoaded = true;
}

// Compute face descriptor from a canvas/image element; returns Float32Array or null
async function getFaceDescriptor(imgEl) {
  try {
    const detection = await faceapi
      .detectSingleFace(imgEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  } catch { return null; }
}

// Extract face descriptor from a registered security photo (URL or base64 string)
async function extractDescriptorFromPhoto(rawPhoto) {
  const s = String(rawPhoto ?? "").trim();
  if (!s || s.length < 10) return null;
  let src;
  if (s.startsWith("http") || s.startsWith("data:")) src = s;
  else if (s.length > 100) src = `data:image/jpeg;base64,${s}`;
  else return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 320;
      canvas.height = img.naturalHeight || 320;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(await getFaceDescriptor(canvas));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}


const today = () => new Date().toISOString().split("T")[0];

const fmtTime = v => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v; // SP returns time strings like "7:57" — display as-is
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const fmtDate = v => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return v; }
};

// ─── Identity Verification Modal ─────────────────────────────────────────────
// Auto Scan: face stays in oval for ~3 s → auto-verifies against registered photo.
// Manual: one tap → instant verify from live video frame. No photo saved.
// referenceDescriptors: Float32Array[] — one or more registered face descriptors
function FaceCaptureModal({ referenceDescriptors, onVerified, onCancel }) {
  const [stream, setStream]         = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [initError, setInitError]   = useState(null);
  const [retryKey, setRetryKey]     = useState(0);
  const [autoScan, setAutoScan]     = useState(false);
  const [faceCount, setFaceCount]   = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Position your face in the oval");
  const [verifying, setVerifying]   = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // null | "matched" | "no-match"
  const [matchDistance, setMatchDistance] = useState(null);

  const videoRef       = useRef(null);
  const scanIntervalRef = useRef(null);
  const scanProgressRef = useRef(0);   // mutable progress inside interval
  const busyRef         = useRef(false); // prevent overlapping detections

  // ── Camera + model init ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitError(null);
      setModelsReady(false);
      setScanStatus("Loading face models…");
      try { await loadFaceModels(); }
      catch { if (!cancelled) setInitError("Face AI models failed to load — check connection."); return; }
      if (cancelled) return;
      setModelsReady(true);
      setScanStatus("Position your face in the oval");
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!cancelled) setStream(s);
      } catch (e) {
        if (!cancelled) {
          const m = {
            NotAllowedError: "Camera permission denied — tap Allow in browser settings",
            PermissionDeniedError: "Camera permission denied",
            NotFoundError: "No camera found on this device",
            NotReadableError: "Camera in use by another app — close it and retry",
            AbortError: "Camera in use by another app — close it and retry",
          };
          setInitError(m[e.name] || `Camera error: ${e.message}`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]); // eslint-disable-line

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  // ── Scan loop ──────────────────────────────────────────────────────────────
  const stopScan = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    scanProgressRef.current = 0;
    setScanProgress(0);
    busyRef.current = false;
  }, []);

  const runVerification = useCallback(async (descriptor) => {
    setVerifying(true);
    setAutoScan(false);
    stopScan();
    // Find min distance across all registered reference descriptors
    const refs = Array.isArray(referenceDescriptors) ? referenceDescriptors : [referenceDescriptors];
    const distance = Math.min(...refs.map(rd => faceapi.euclideanDistance(rd, descriptor)));
    setMatchDistance(distance);
    if (distance < 0.6) {
      setVerifyResult("matched");
      if (stream) stream.getTracks().forEach(t => t.stop());
      setTimeout(() => onVerified(), 1500);
    } else {
      setVerifyResult("no-match");
      setVerifying(false);
    }
  }, [referenceDescriptors, stream, onVerified, stopScan]);

  const startScan = useCallback(() => {
    if (scanIntervalRef.current) return;
    scanProgressRef.current = 0;
    setScanProgress(0);
    // Each hit +10 → 10 hits × 300 ms = 3 seconds of locked face to trigger
    scanIntervalRef.current = setInterval(async () => {
      if (busyRef.current) return;
      const v = videoRef.current;
      if (!v || v.readyState !== 4) return;
      busyRef.current = true;
      try {
        const det = await faceapi
          .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        if (det) {
          setFaceCount(1);
          setScanStatus("Face locked — hold still…");
          scanProgressRef.current = Math.min(scanProgressRef.current + 10, 100);
          setScanProgress(scanProgressRef.current);
          if (scanProgressRef.current >= 100) {
            stopScan();
            await runVerification(det.descriptor);
          }
        } else {
          setFaceCount(0);
          scanProgressRef.current = 0;
          setScanProgress(0);
          setScanStatus("Position your face in the oval");
        }
      } catch { /* ignore detection errors */ }
      busyRef.current = false;
    }, 300);
  }, [stopScan, runVerification]);

  // Start/stop scan based on autoScan toggle
  useEffect(() => {
    if (autoScan && modelsReady && stream && !verifyResult) startScan();
    else stopScan();
    return stopScan;
  }, [autoScan, modelsReady, stream, verifyResult, startScan, stopScan]);

  // ── Manual verify ──────────────────────────────────────────────────────────
  const handleManual = async () => {
    const v = videoRef.current;
    if (!v || v.readyState !== 4 || verifying) return;
    setVerifying(true);
    stopScan();
    setAutoScan(false);
    setScanStatus("Verifying…");
    try {
      const det = await faceapi
        .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!det) {
        setScanStatus("No face detected — try again");
        setVerifying(false);
        return;
      }
      await runVerification(det.descriptor);
    } catch {
      setScanStatus("Detection error — try again");
      setVerifying(false);
    }
  };

  // ── Retry ──────────────────────────────────────────────────────────────────
  const doRetry = () => {
    stopScan();
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setAutoScan(false);
    setVerifyResult(null);
    setMatchDistance(null);
    setFaceCount(0);
    setScanProgress(0);
    setScanStatus("Position your face in the oval");
    setVerifying(false);
    setInitError(null);
    setRetryKey(k => k + 1);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    overlay: { position:"fixed", inset:0, zIndex:800, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
    box: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", width:"min(420px,96vw)", overflow:"hidden" },
    header: { padding:"14px 16px 0", textAlign:"center" },
    title: { fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:2 },
    sub: { fontSize:11, color:"var(--text2)", marginBottom:12 },
    btnRow: { display:"flex", gap:8, padding:"10px 16px 14px" },
    btnBlue: { flex:1, padding:"11px 0", background:"#2563eb", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
    btnStop: { flex:1, padding:"11px 0", background:"#d97706", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
    btnGray: { flex:1, padding:"11px 0", background:"var(--surface2)", color:"var(--text)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
    cancel: { display:"block", width:"100%", padding:"9px 0", background:"none", color:"var(--text2)", border:"none", fontSize:12, cursor:"pointer", borderTop:"1px solid var(--border)" },
    resultBox: { padding:"24px 20px 20px", textAlign:"center" },
    retryBtn: { width:"100%", padding:"11px 0", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:8 },
    cancelBtn: { width:"100%", padding:"9px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:12, cursor:"pointer" },
  };

  // ── Result screen ──────────────────────────────────────────────────────────
  if (verifyResult) {
    const matched = verifyResult === "matched";
    return (
      <div style={S.overlay}>
        <div style={S.box}>
          <div style={S.resultBox}>
            {matched
              ? <CheckCircle size={52} style={{ color:"#22c55e" }}/>
              : <XCircle size={52} style={{ color:"#ef4444" }}/>
            }
            <div style={{ fontWeight:700, fontSize:17, color: matched ? "#22c55e" : "#ef4444", marginTop:14, marginBottom:6 }}>
              {matched ? "Identity Verified" : "Face Does Not Match"}
            </div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>
              {matched ? "Starting patrol…" : `Similarity ${((1 - matchDistance) * 100).toFixed(0)}% — need ≥ 40%`}
            </div>
          </div>
          {!matched && (
            <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={doRetry} style={S.retryBtn}>Try Again</button>
              <button onClick={onCancel} style={S.cancelBtn}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const ringColor = faceCount === 1
    ? (autoScan ? "#facc15" : "#22c55e")  // yellow while scanning, green when detected+idle
    : "#475569";
  const ringGlow = faceCount === 1
    ? (autoScan ? "0 0 20px rgba(250,204,21,0.5)" : "0 0 16px rgba(34,197,94,0.45)")
    : "none";

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.title}>Identity Verification</div>
          <div style={S.sub}>Auto scan or tap Manual to verify your identity</div>
        </div>

        {/* Error */}
        {initError && (
          <div style={{ margin:"0 16px 12px", padding:"10px 12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius-xs)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--red)", marginBottom:8 }}>
              <AlertTriangle size={13}/> {initError}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={doRetry} style={{ flex:1, padding:"7px 0", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-xs)", fontSize:12, fontWeight:700, cursor:"pointer" }}>Retry</button>
              <button onClick={onCancel} style={{ flex:1, padding:"7px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-xs)", fontSize:12, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Camera */}
        {!initError && (
          <div style={{ position:"relative", background:"#000", aspectRatio:"4/3", margin:"10px 0 0" }}>
            <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} playsInline muted autoPlay/>

            {/* Oval ring */}
            <div style={{ position:"absolute", left:"12%", right:"12%", top:"6%", bottom:"6%", borderRadius:"50%", border:`3px solid ${ringColor}`, transition:"border-color 0.25s, box-shadow 0.25s", boxShadow: ringGlow, pointerEvents:"none" }}/>

            {/* Progress bar — only visible during auto scan */}
            {autoScan && scanProgress > 0 && (
              <div style={{ position:"absolute", bottom:44, left:"12%", right:"12%", height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${scanProgress}%`, background:"#facc15", borderRadius:2, transition:"width 0.25s" }}/>
              </div>
            )}

            {/* Status badge */}
            <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap" }}>
              <span style={{
                display:"inline-flex", alignItems:"center", gap:5,
                padding:"4px 12px", borderRadius:20, fontSize:11,
                background: faceCount === 1 ? (autoScan ? "rgba(92,64,0,0.9)" : "rgba(21,128,61,0.88)") : "rgba(15,23,42,0.88)",
                color:       faceCount === 1 ? (autoScan ? "#fde68a" : "#86efac") : "#94a3b8",
                border:`1px solid ${faceCount === 1 ? (autoScan ? "#78350f" : "#166534") : "#334155"}`,
              }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background: faceCount === 1 ? (autoScan ? "#facc15" : "#4ade80") : "#475569", display:"inline-block" }}/>
                {verifying ? "Verifying…" : scanStatus}
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        {!initError && (
          <div style={S.btnRow}>
            {!autoScan
              ? <button style={S.btnBlue} onClick={() => setAutoScan(true)} disabled={!modelsReady || !stream || verifying}>
                  <RefreshCw size={14}/> Start Auto Scan
                </button>
              : <button style={S.btnStop} onClick={() => setAutoScan(false)}>
                  <Loader size={14} style={{ animation:"spin 1s linear infinite" }}/> Stop Scan
                </button>
            }
            <button style={S.btnGray} onClick={handleManual} disabled={!modelsReady || !stream || verifying}>
              <Eye size={14}/> Manual
            </button>
          </div>
        )}

        <button style={S.cancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Validate Patrol Point Modal ─────────────────────────────────────────────
// Flow: GPS locate → show found point → guard taps Confirm → checkpoint logged
// No selfie, no camera, no face check — face was verified once at patrol start.
function ValidateModal({ session, onClose, onSuccess, onGpsRead, setToast }) {
  const [step, setStep]               = useState("locating"); // locating | found | verifying
  const [foundPoint, setFoundPoint]   = useState(null);
  const [gpsProgress, setGpsProgress] = useState(0);
  const [capturedCoords, setCapturedCoords] = useState(null);

  // GPS: 3 readings → weighted average → validate against patrol points
  useEffect(() => {
    if (!navigator.geolocation) {
      setToast({ type: "error", msg: "GPS not supported on this device" });
      onClose();
      return;
    }
    const readings = [];
    const takeReading = (n) => {
      setGpsProgress(n);
      navigator.geolocation.getCurrentPosition(
        async pos => {
          readings.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
          if (n < 3) {
            setTimeout(() => takeReading(n + 1), 800);
          } else {
            const totalWeight = readings.reduce((s, r) => s + 1 / r.acc, 0);
            const avgLat = readings.reduce((s, r) => s + r.lat / r.acc, 0) / totalWeight;
            const avgLng = readings.reduce((s, r) => s + r.lng / r.acc, 0) / totalWeight;
            const coords = { lat: avgLat.toFixed(6), lng: avgLng.toFixed(6) };
            setCapturedCoords(coords);
            onGpsRead?.(coords);
            try {
              const res = await validatePatrolPoint(avgLat, avgLng);
              if (res.success && res.data) {
                setFoundPoint(res.data);
                setStep("found");
              } else {
                setToast({ type: "error", msg: `No patrol point found within 6 metres (GPS: ${coords.lat}, ${coords.lng})` });
                onClose();
              }
            } catch (err) {
              setToast({ type: "error", msg: `${err.response?.data?.message || "Location validation failed"} (GPS: ${coords.lat}, ${coords.lng})` });
              onClose();
            }
          }
        },
        err => {
          const msgs = { 1: "Location permission denied", 2: "Location unavailable", 3: "Location request timed out" };
          setToast({ type: "error", msg: msgs[err.code] || "Failed to get GPS location" });
          onClose();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    };
    takeReading(1);
  }, []); // eslint-disable-line

  const submitCheckpoint = async () => {
    setStep("verifying");
    try {
      const res = await logSessionCheckpoint(session.uid, {
        locationUid:  foundPoint.uid,
        locationName: foundPoint.name,
      });
      if (res.success) {
        onSuccess({ ...res.data, _gps: capturedCoords });
      } else {
        setToast({ type: "error", msg: res.message || "Checkpoint log failed" });
        onClose();
      }
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to submit checkpoint" });
      onClose();
    }
  };

  const S = {
    overlay: { position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
    box: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", width:"100%", maxWidth:380, padding:24, boxShadow:"var(--shadow)" },
    title: { fontSize:16, fontWeight:700, color:"var(--accent)", marginBottom:20, textAlign:"center" },
    label: { fontSize:12, color:"var(--text2)", marginBottom:6 },
    pointBox: { background:"var(--surface2)", border:"1px solid var(--accent)", borderRadius:"var(--radius-sm)", padding:"14px 16px", fontSize:15, fontWeight:700, color:"var(--text)", marginBottom:20, display:"flex", alignItems:"center", gap:10 },
    btn: { width:"100%", padding:"14px", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-sm)", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.box}>
        <div style={S.title}>Validate Patrol Point</div>

        {step === "locating" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <Loader size={32} style={{ color:"var(--accent)", animation:"spin 1s linear infinite", marginBottom:12 }}/>
            <p style={{ color:"var(--text2)", fontSize:13 }}>
              {gpsProgress > 0 ? `Reading GPS ${gpsProgress}/3…` : "Getting GPS location…"}
            </p>
            {gpsProgress > 0 && (
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:8 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ width:8, height:8, borderRadius:"50%", background: i <= gpsProgress ? "var(--accent)" : "var(--border)" }}/>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "found" && (
          <>
            <div style={S.label}>Patrol Point Found</div>
            <div style={S.pointBox}>
              <MapPin size={18} style={{ color:"var(--accent)", flexShrink:0 }}/>
              {foundPoint?.name}
            </div>
            <button style={S.btn} onClick={submitCheckpoint}>
              <CheckCircle size={18}/> Confirm &amp; Log
            </button>
            <button onClick={onClose} style={{ display:"block", width:"100%", marginTop:10, padding:"9px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
          </>
        )}

        {step === "verifying" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <Loader size={28} style={{ color:"var(--accent)", animation:"spin 1s linear infinite", marginBottom:10 }}/>
            <p style={{ color:"var(--text2)", fontSize:13 }}>Saving checkpoint…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Patrol Session Screen (Screen 2) ────────────────────────────────────────
function PatrolSession({ session, onBack, setToast }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showValidate, setShowValidate] = useState(false);
  const [ending, setEnding]           = useState(false);
  const [lastGps, setLastGps]         = useState(null); // { lat, lng } — temp debug display

  const loadCheckpoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSessionCheckpoints(session.uid);
      setCheckpoints(res.data || []);
    } catch { setToast({ type: "error", msg: "Failed to load checkpoints" }); }
    finally { setLoading(false); }
  }, [session.uid]); // eslint-disable-line

  useEffect(() => { loadCheckpoints(); }, [loadCheckpoints]);

  const handleCheckpointSuccess = (newRow) => {
    setShowValidate(false);
    if (newRow?._gps) setLastGps(newRow._gps);
    loadCheckpoints();
    setToast({ type: "success", msg: "Patrol point validated successfully" });
  };

  const handleEndPatrol = async () => {
    setEnding(true);
    try {
      await endPatrolSession(session.uid);
      setToast({ type: "success", msg: "Patrol ended" });
      onBack(true, session); // pass session so parent can record end time locally
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to end patrol" });
    } finally { setEnding(false); }
  };

  const S = {
    infoRow: {
      display: "flex", alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid var(--border)",
      gap: 8,
    },
    infoLabel: { fontSize: 12, color: "var(--text2)", minWidth: 90 },
    infoVal:   { fontSize: 13, fontWeight: 600, color: "var(--text)" },
    th: { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text2)", textAlign: "left", background: "var(--surface2)", borderBottom: "1px solid var(--border)" },
    td: { padding: "10px 12px", fontSize: 13, color: "var(--text)", borderBottom: "1px solid var(--border)" },
  };

  return (
    <>
      {showValidate && (
        <ValidateModal
          session={session}
          onClose={() => setShowValidate(false)}
          onSuccess={handleCheckpointSuccess}
          onGpsRead={coords => setLastGps(coords)}
          setToast={setToast}
        />
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        {/* Header */}
        <div style={{
          background: "var(--accent)", borderRadius: "var(--radius) var(--radius) 0 0",
          padding: "12px 16px", margin: "-1px -1px 0 -1px",
          fontSize: 15, fontWeight: 800, color: "#000", textAlign: "center",
        }}>
          Patrol
        </div>

        {/* Info rows */}
        <div style={{ padding: "0 16px" }}>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Gate Name</span>
            <span style={{ color: "var(--text3)", fontSize: 13 }}>:</span>
            <span style={S.infoVal}>{session.gateName || "—"}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Security</span>
            <span style={{ color: "var(--text3)", fontSize: 13 }}>:</span>
            <span style={S.infoVal}>{session.securityName || "—"}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Patrol ID</span>
            <span style={{ color: "var(--text3)", fontSize: 13 }}>:</span>
            <span style={S.infoVal}>{session.patrolId || "—"}</span>
          </div>
        </div>

        {/* Validate button */}
        {!session.endTime && (
          <div style={{ padding: "14px 16px 0" }}>
            <button
              onClick={() => setShowValidate(true)}
              style={{
                width: "100%", padding: "12px",
                background: "var(--accent)", color: "#000",
                border: "none", borderRadius: "var(--radius-sm)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <MapPin size={15} /> Validate Patrol Point
            </button>
          </div>
        )}

        {/* GPS coordinate label — temporary, for testing only */}
        {lastGps && (
          <div style={{ margin: "10px 16px 0", padding: "8px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={12} style={{ color: "var(--accent)", flexShrink: 0 }}/>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text2)" }}>
              GPS sent: {lastGps.lat}, {lastGps.lng}
            </span>
          </div>
        )}

        {/* Checkpoints table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 50 }}>SlNo</th>
                <th style={S.th}>Patrol Point</th>
                <th style={{ ...S.th, width: 90 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ ...S.td, textAlign: "center", color: "var(--text3)" }}>
                  Loading...
                </td></tr>
              ) : checkpoints.length === 0 ? (
                <tr><td colSpan={3} style={{ ...S.td, textAlign: "center", color: "var(--text3)" }}>
                  No checkpoints yet
                </td></tr>
              ) : checkpoints.map((cp, i) => (
                <tr key={cp.uid ?? i}>
                  <td style={{ ...S.td, textAlign: "center" }}>{cp.slNo ?? i + 1}</td>
                  <td style={S.td}>{cp.locationName || cp.LocationName || "—"}</td>
                  <td style={S.td}>{fmtTime(cp.visitedAt || cp.VisitedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 16px", display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button
            onClick={() => onBack(false)}
            style={{
              padding: "10px 20px",
              background: "var(--accent)", color: "#000",
              border: "none", borderRadius: "var(--radius-sm)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <ChevronLeft size={15} /> Back
          </button>
          {!session.endTime && (
            <button
              onClick={handleEndPatrol}
              disabled={ending}
              style={{
                padding: "10px 20px",
                background: "var(--surface2)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
              {ending ? "Ending..." : "End Patrol"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Patrol List Screen (Screen 1) ───────────────────────────────────────────
export default function SecurityPatrol() {
  const { user } = useAuth();
  const [date, setDate]           = useState(today());
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [toast, setToast]         = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [pendingRef, setPendingRef] = useState(null); // registered face descriptor waiting for live verify

  // SP_App_Get_PatrolM_FrontGrid does not return today's sessions.
  // We track locally-created sessions and merge them with SP data so they stay visible.
  const localSessionsRef = useRef([]); // { ...sessionData, _date: "YYYY-MM-DD", endTime? }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPatrolSessions(date, user?.gateId || 0);
      const spData = res.data || [];
      const spUids = new Set(spData.map(s => String(s.uid)));
      const localOnly = localSessionsRef.current.filter(s =>
        s._date === date && !spUids.has(String(s.uid))
      );
      setSessions([...spData, ...localOnly]);
    } catch {
      setToast({ type: "error", msg: "Failed to load patrol sessions" });
    } finally { setLoading(false); }
  }, [date, user?.gateId]);

  useEffect(() => { if (!activeSession) load(); }, [load, activeSession]);

  const handleNew = async () => {
    // Face was already verified earlier this session — skip camera, create session directly
    if (faceVerifiedThisSession) {
      await handleFaceVerified();
      return;
    }

    setCreating(true);
    try {
      // Pre-warm models in background
      loadFaceModels().catch(() => {});

      // Fetch face data for this guard via PR_Get_FaceData
      // Try specific uid first; if SP returns empty (known SP bug), fall back to uid=0 and filter
      const myUid = user?.userId || 0;
      let faceRows = [];
      const faceRes = await api.get(`/setup/securities/facedata?uid=${myUid}`);
      faceRows = faceRes.data?.data || [];
      if (faceRows.length === 0 && myUid > 0) {
        const allRes = await api.get(`/setup/securities/facedata?uid=0`);
        const allRows = allRes.data?.data || [];
        faceRows = allRows.filter(r => Number(r.Uid ?? r.uid ?? 0) === myUid);
      }
      const faceRow = faceRows[0] || null;
      const rawFaceData = faceRow
        ? (faceRow.FData ?? faceRow.fdata ?? faceRow.FaceData ?? faceRow.facedata ?? null)
        : null;

      if (!rawFaceData) {
        setToast({ type: "error", msg: "Face not registered — ask admin to register your face in Setup → Securities." });
        return;
      }

      let referenceDescriptors = null;
      try {
        const parsed = JSON.parse(rawFaceData);
        if (Array.isArray(parsed.descriptors) && parsed.descriptors.length > 0) {
          referenceDescriptors = parsed.descriptors.map(d => new Float32Array(d));
        }
      } catch {
        setToast({ type: "error", msg: "Face data is corrupt — ask admin to re-register your face." });
        return;
      }

      if (!referenceDescriptors) {
        setToast({ type: "error", msg: "No face descriptors found — ask admin to re-register your face." });
        return;
      }

      await loadFaceModels();

      // Show live face verification modal; session is only created after match
      setPendingRef(referenceDescriptors);
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to load security profile" });
    } finally { setCreating(false); }
  };

  const handleFaceVerified = async () => {
    faceVerifiedThisSession = true; // mark so subsequent "New" clicks skip camera
    setPendingRef(null);
    try {
      const res = await createPatrolSession(user?.gateName || "", user?.userName || "");
      if (res.success) {
        const tracked = { ...res.data, _date: date };
        localSessionsRef.current = [...localSessionsRef.current, tracked];
        setActiveSession(tracked);
      } else {
        setToast({ type: "error", msg: res.message || "Failed to create patrol session" });
      }
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to create patrol" });
    }
  };

  const handleFaceCancel = () => setPendingRef(null);

  const handleSessionRow = (session) => setActiveSession(session);

  const handleBackFromSession = (refresh, endedSession) => {
    setActiveSession(null);
    if (endedSession) {
      // Record end time locally so it shows in the list even if SP doesn't return today's sessions
      const endTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      localSessionsRef.current = localSessionsRef.current.map(s =>
        String(s.uid) === String(endedSession.uid) ? { ...s, endTime } : s
      );
    }
    if (refresh) load();
  };

  const S = {
    th: { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text2)", textAlign: "left", background: "var(--surface2)", borderBottom: "1px solid var(--border)" },
    td: { padding: "10px 12px", fontSize: 13, color: "var(--text)", borderBottom: "1px solid var(--border)", cursor: "pointer" },
  };

  if (pendingRef) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <FaceCaptureModal
          referenceDescriptors={pendingRef}
          onVerified={handleFaceVerified}
          onCancel={handleFaceCancel}
        />
      </>
    );
  }

  if (activeSession) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <PatrolSession
          session={activeSession}
          onBack={handleBackFromSession}
          setToast={setToast}
        />
      </>
    );
  }

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="card">
        {/* Header */}
        <div style={{
          background: "var(--accent)", borderRadius: "var(--radius) var(--radius) 0 0",
          padding: "12px 16px", margin: "-1px -1px 0 -1px",
          fontSize: 15, fontWeight: 800, color: "#000", textAlign: "center",
        }}>
          Patrol List
        </div>

        {/* Date & Gate info */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text2)", minWidth: 40 }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="date-input"
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text2)", minWidth: 68 }}>Gate Name</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {user?.gateName || "—"}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginLeft: "auto" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Sessions table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Patrol ID</th>
                <th style={S.th}>Security</th>
                <th style={S.th}>Start</th>
                <th style={S.th}>End</th>
                <th style={{ ...S.th, width: 60, textAlign: "center" }}>View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "var(--text3)", cursor: "default" }}>
                  <div style={{ padding: "20px 0" }}>Loading...</div>
                </td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "var(--text3)", cursor: "default" }}>
                  <div style={{ padding: "20px 0" }}>
                    <Shield size={28} style={{ color: "var(--text3)", marginBottom: 8 }} />
                    <div>No patrol sessions for {fmtDate(date)}</div>
                  </div>
                </td></tr>
              ) : sessions.map((s, i) => (
                <tr key={s.uid ?? i}
                  style={{ transition: "background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={S.td}>
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                      {(s.patrolId && String(s.patrolId) !== "0") ? s.patrolId : (s.uid ? `#${s.uid}` : "—")}
                    </span>
                  </td>
                  <td style={S.td}>{s.securityName || s.SecurityName || "—"}</td>
                  <td style={S.td}>{fmtTime(s.startTime || s.StartTime)}</td>
                  <td style={S.td}>{(() => {
                    const et = s.endTime || s.EndTime;
                    if (!et || et === "00:00" || et === "00:00:00" || et === "00:00:00.000")
                      return <span style={{ color: "var(--green)", fontSize: 11, fontWeight: 600 }}>Active</span>;
                    return fmtTime(et);
                  })()}</td>
                  <td style={{ ...S.td, textAlign: "center", cursor: "default" }}>
                    <button
                      onClick={() => handleSessionRow(s)}
                      style={{
                        padding: "5px 10px",
                        background: "var(--accent-dim)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        borderRadius: "var(--radius-xs)",
                        color: "var(--accent)", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                      <Eye size={12}/> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* New button */}
        <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleNew}
            disabled={creating}
            style={{
              padding: "11px 40px",
              background: "var(--accent)", color: "#000",
              border: "none", borderRadius: "var(--radius-sm)",
              fontSize: 14, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              opacity: creating ? 0.7 : 1,
            }}>
            {creating ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} />Creating...</> : "New"}
          </button>
        </div>
      </div>
    </div>
  );
}
