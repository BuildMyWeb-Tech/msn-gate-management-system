import React, { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import { useAuth } from "../../context/AuthContext";
import {
  getPatrolSessions, createPatrolSession, endPatrolSession,
  getSessionCheckpoints, validatePatrolPoint, logSessionCheckpoint,
} from "../../services/patrolService";
import Toast from "../../components/Toast";
import { Shield, Camera, MapPin, RefreshCw, ChevronLeft, Loader, Eye, UserCheck, AlertTriangle } from "lucide-react";

// Load face-api models once (lazy, on first need)
let faceModelsLoaded = false;
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

// ─── Reference Face Capture Modal ────────────────────────────────────────────
// Opens front camera via getUserMedia (works on mobile + desktop).
// Continuously polls for face detection; capture only enabled when a face is in frame.
function FaceCaptureModal({ onCapture, onSkip }) {
  const [stream, setStream]           = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [status, setStatus]           = useState("Initialising…");
  const [capturing, setCapturing]     = useState(false);
  const [initError, setInitError]     = useState(null);
  const [retryKey, setRetryKey]       = useState(0);
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);

  // Load models + open front camera on mount (re-runs on retry)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitError(null);
      setModelsReady(false);
      setFaceDetected(false);
      setStatus("Loading face AI models…");
      try { await loadFaceModels(); }
      catch { if (!cancelled) setInitError("Face AI models failed to load — check your connection."); return; }
      if (cancelled) return;
      setModelsReady(true);
      setStatus("Opening front camera…");
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

  // Wire stream → <video>
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Stop stream on unmount or retry
  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  // Face detection polling — every 500 ms once models + stream are ready
  const startDetection = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.readyState !== 4) return;
      try {
        const d = await faceapi
          .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true);
        setFaceDetected(!!d);
        setStatus(d ? "Face detected — press Capture" : "Position your face in the oval");
      } catch { setFaceDetected(false); }
    }, 500);
  }, []);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (modelsReady && stream) {
      const t = setTimeout(() => { setStatus("Position your face in the oval"); startDetection(); }, 600);
      return () => { clearTimeout(t); stopDetection(); };
    }
    return stopDetection;
  }, [modelsReady, stream, startDetection, stopDetection]);

  const handleCapture = async () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    setCapturing(true);
    setStatus("Capturing…");
    stopDetection();
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0);
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStatus("Detecting face…");
    const descriptor = await getFaceDescriptor(c);
    if (!descriptor) {
      setInitError("No face detected in capture — please retry.");
      setCapturing(false);
      return;
    }
    onCapture(descriptor);
  };

  const doRetry = () => {
    stopDetection();
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setCapturing(false);
    setRetryKey(k => k + 1);
  };

  const S = {
    overlay: { position:"fixed", inset:0, zIndex:800, background:"rgba(0,0,0,0.90)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
    box: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", width:"min(400px,95vw)", padding:20 },
    title: { fontWeight:700, fontSize:15, color:"var(--text)", textAlign:"center", marginBottom:4 },
    sub: { fontSize:12, color:"var(--text2)", textAlign:"center", marginBottom:16 },
    btn: { width:"100%", padding:"11px 0", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
    btnOff: { width:"100%", padding:"11px 0", background:"var(--border)", color:"var(--text2)", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"not-allowed", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
    skip: { width:"100%", padding:"9px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:12, cursor:"pointer" },
  };

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <canvas ref={canvasRef} style={{ display:"none" }}/>
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <UserCheck size={28} style={{ color:"var(--accent)" }}/>
        </div>
        <div style={S.title}>Face Registration</div>
        <div style={S.sub}>Look at the front camera. Capture when your face is detected.</div>

        {initError ? (
          <div style={{ padding:"12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius-xs)", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--red)", marginBottom:10 }}>
              <AlertTriangle size={13}/> {initError}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={doRetry} style={{ flex:1, padding:"7px 0", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-xs)", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Retry
              </button>
              <button onClick={onSkip} style={{ flex:1, padding:"7px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-xs)", fontSize:12, cursor:"pointer" }}>
                Skip Verification
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Live camera view with face-ring overlay */}
            <div style={{ position:"relative", background:"#000", borderRadius:"var(--radius-sm)", overflow:"hidden", marginBottom:12, aspectRatio:"4/3" }}>
              <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} playsInline muted autoPlay/>
              {/* Oval face ring — fills 80% of frame, green when detected */}
              <div style={{ position:"absolute", left:"10%", right:"10%", top:"8%", bottom:"8%", borderRadius:"50%", border:`3px solid ${faceDetected ? "#22c55e" : "#475569"}`, transition:"border-color 0.3s, box-shadow 0.3s", boxShadow: faceDetected ? "0 0 20px rgba(34,197,94,0.55)" : "none", pointerEvents:"none" }}/>
              {/* Status badge */}
              <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap" }}>
                <span style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"4px 12px", borderRadius:20, fontSize:11,
                  background: faceDetected ? "rgba(21,128,61,0.88)" : "rgba(15,23,42,0.88)",
                  color: faceDetected ? "#86efac" : "#94a3b8",
                  border:`1px solid ${faceDetected ? "#166534" : "#334155"}`,
                }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: faceDetected ? "#4ade80" : "#475569", display:"inline-block" }}/>
                  {status}
                </span>
              </div>
            </div>

            {faceDetected
              ? <button style={S.btn} onClick={handleCapture} disabled={capturing}>
                  {capturing ? <><Loader size={14} style={{ animation:"spin 1s linear infinite" }}/> Processing…</> : <><Camera size={14}/> Capture Face</>}
                </button>
              : <button style={S.btnOff} disabled>
                  <Camera size={14}/> Waiting for face…
                </button>
            }
            <button style={S.skip} onClick={onSkip}>Skip (no face verification)</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Validate Patrol Point Modal ─────────────────────────────────────────────
function ValidateModal({ session, onClose, onSuccess, onGpsRead, setToast }) {
  const [step, setStep]             = useState("locating"); // locating | found | selfie | verifying | face-checking
  const [foundPoint, setFoundPoint] = useState(null);
  const [stream, setStream]         = useState(null);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [faceStatus, setFaceStatus] = useState(""); // "" | "matched:x" | "no-match:x" | "no-face"
  const [faceInFrame, setFaceInFrame] = useState(false); // true when selfie camera detects a face
  const [selfieStatus, setSelfieStatus] = useState("Position your face in the oval");
  const [gpsProgress, setGpsProgress] = useState(0); // 0-3 (shows Reading n/3)
  const [capturedCoords, setCapturedCoords] = useState(null); // { lat, lng } — temp debug display
  const videoRef          = useRef(null); // live camera preview
  const capturedCanvasRef = useRef(null); // holds snapshot for face comparison
  const selfieIntervalRef = useRef(null); // face detection polling for selfie

  const stopStream = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);
  useEffect(() => () => stopStream(), [stopStream]);
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Step 1 — take 3 GPS readings, weighted average by accuracy, then validate
  useEffect(() => {
    if (!navigator.geolocation) {
      setToast({ type: "error", msg: "GPS not supported on this device" });
      onClose();
      return;
    }
    const SAMPLES = 3;
    const readings = [];

    const takeReading = (n) => {
      setGpsProgress(n);
      navigator.geolocation.getCurrentPosition(
        async pos => {
          readings.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
          if (n < SAMPLES) {
            setTimeout(() => takeReading(n + 1), 800);
          } else {
            const totalWeight = readings.reduce((s, r) => s + 1 / r.acc, 0);
            const avgLat = readings.reduce((s, r) => s + r.lat / r.acc, 0) / totalWeight;
            const avgLng = readings.reduce((s, r) => s + r.lng / r.acc, 0) / totalWeight;
            const coords = { lat: avgLat.toFixed(6), lng: avgLng.toFixed(6) };
            setCapturedCoords(coords);
            onGpsRead?.(coords); // lift coords to parent immediately — before SP call
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

  // Stop selfie detection polling
  const stopSelfieDetection = useCallback(() => {
    if (selfieIntervalRef.current) { clearInterval(selfieIntervalRef.current); selfieIntervalRef.current = null; }
  }, []);

  // Start face detection polling when selfie camera is live
  useEffect(() => {
    if (step === "selfie" && stream) {
      const t = setTimeout(() => {
        selfieIntervalRef.current = setInterval(async () => {
          const v = videoRef.current;
          if (!v || v.readyState !== 4) return;
          try {
            const d = await faceapi
              .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
              .withFaceLandmarks(true);
            setFaceInFrame(!!d);
            setSelfieStatus(d ? "Face detected — press Capture" : "Position your face in the oval");
          } catch { setFaceInFrame(false); }
        }, 500);
      }, 600);
      return () => { clearTimeout(t); stopSelfieDetection(); };
    }
    return stopSelfieDetection;
  }, [step, stream, stopSelfieDetection]);

  // Step 2 — Open front camera (works on both mobile and desktop via getUserMedia)
  const openCamera = async () => {
    setFaceStatus("");
    setFaceInFrame(false);
    setSelfieStatus("Position your face in the oval");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(s);
      setStep("selfie");
    } catch (e) {
      const msgs = {
        NotAllowedError: "Camera permission denied — allow in browser settings",
        PermissionDeniedError: "Camera permission denied",
        NotFoundError: "No camera found on this device",
        NotReadableError: "Camera in use by another app — close it and retry",
        AbortError: "Camera in use by another app — close it and retry",
      };
      setToast({ type: "error", msg: msgs[e.name] || `Could not open camera — ${e.message}` });
    }
  };

  // Capture selfie frame from live video
  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    stopSelfieDetection();
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    capturedCanvasRef.current = canvas;
    stopStream();
    canvas.toBlob(blob => {
      setSelfieBlob(blob);
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.85));
      const refDescriptor = session?.faceDescriptor;
      if (refDescriptor) { setStep("face-checking"); verifyFace(refDescriptor, blob); }
      else { setStep("verifying"); submitCheckpoint(blob); }
    }, "image/jpeg", 0.85);
  };

  const verifyFace = async (refDescriptor, blob) => {
    try {
      const snapshotCanvas = capturedCanvasRef.current;
      if (!snapshotCanvas) { setStep("verifying"); submitCheckpoint(blob); return; }

      // Ensure models are loaded — critical if verifyFace is called before
      // FaceCaptureModal.processCapture finishes loading them
      await loadFaceModels();

      const selfieDescriptor = await getFaceDescriptor(snapshotCanvas);
      if (!selfieDescriptor) {
        setFaceStatus("no-face");
        return;
      }

      // Ensure both descriptors are Float32Array — React state preserves typed arrays
      // but we convert explicitly for safety
      const ref     = refDescriptor instanceof Float32Array ? refDescriptor : new Float32Array(Object.values(refDescriptor));
      const selfie  = selfieDescriptor instanceof Float32Array ? selfieDescriptor : new Float32Array(Object.values(selfieDescriptor));
      const distance = faceapi.euclideanDistance(ref, selfie);

      // distance < 0.5 = strong match, 0.5–0.6 = likely same person, > 0.6 = different
      if (distance < 0.6) {
        setFaceStatus(`matched:${distance.toFixed(3)}`);
        setTimeout(() => { setStep("verifying"); submitCheckpoint(blob); }, 1000);
      } else {
        setFaceStatus(`no-match:${distance.toFixed(3)}`);
        setTimeout(() => {
          setFaceStatus("");
          setSelfieBlob(null);
          setPreviewUrl(null);
          openCamera();
        }, 3000);
      }
    } catch (err) {
      console.warn("[verifyFace] error:", err);
      // On unexpected error, proceed without blocking the checkpoint
      setStep("verifying");
      submitCheckpoint(blob);
    }
  };

  const submitCheckpoint = async (blob) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result; // data:image/jpeg;base64,...
        const res = await logSessionCheckpoint(session.uid, {
          locationUid: foundPoint.uid,
          locationName: foundPoint.name,
          selfieImage: base64,
        });
        if (res.success) {
          onSuccess({ ...res.data, _gps: capturedCoords });
        } else {
          setToast({ type: "error", msg: res.message || "Checkpoint log failed" });
          onClose();
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to submit checkpoint" });
      onClose();
    }
  };

  const S = {
    overlay: {
      position: "fixed", inset: 0, zIndex: 900,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    },
    box: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      width: "100%", maxWidth: 380,
      padding: 24,
      boxShadow: "var(--shadow)",
    },
    title: {
      fontSize: 16, fontWeight: 700,
      color: "var(--accent)",
      marginBottom: 20,
      textAlign: "center",
    },
    label: { fontSize: 12, color: "var(--text2)", marginBottom: 6 },
    pointBox: {
      background: "var(--surface2)",
      border: "1px solid var(--accent)",
      borderRadius: "var(--radius-sm)",
      padding: "10px 14px",
      fontSize: 14, fontWeight: 600,
      color: "var(--text)",
      marginBottom: 20,
      display: "flex", alignItems: "center", gap: 8,
    },
    btn: {
      width: "100%", padding: "12px",
      background: "var(--accent)", color: "#000",
      border: "none", borderRadius: "var(--radius-sm)",
      fontSize: 14, fontWeight: 700,
      cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    },
    video: {
      width: "100%", borderRadius: "var(--radius-sm)",
      background: "#000", marginBottom: 12,
      aspectRatio: "4/3",
    },
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.box}>
        <div style={S.title}>Validate Patrol Point</div>

        {step === "locating" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Loader size={32} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", marginBottom: 12 }} />
            <p style={{ color: "var(--text2)", fontSize: 13 }}>
              {gpsProgress > 0 ? `Reading ${gpsProgress}/3...` : "Getting GPS location..."}
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

        {(step === "found" || step === "selfie" || step === "verifying" || step === "face-checking") && (
          <>
            <div style={S.label}>Patrol Point</div>
            <div style={S.pointBox}>
              <MapPin size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              {foundPoint?.name}
            </div>
            {/* Temporary coordinate display — remove once GPS logic is verified */}
            {capturedCoords && (
              <div style={{ padding:"6px 10px", marginBottom:12, background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"var(--radius-xs)", fontSize:11, fontFamily:"monospace", color:"var(--text2)" }}>
                GPS passed to SP: {capturedCoords.lat}, {capturedCoords.lng}
              </div>
            )}
          </>
        )}

        {step === "found" && (
          <button style={S.btn} onClick={openCamera}>
            <Camera size={16} /> Take Selfie
          </button>
        )}

        {step === "selfie" && (
          <>
            {/* Live camera with face-ring overlay */}
            <div style={{ position:"relative", background:"#000", borderRadius:"var(--radius-sm)", overflow:"hidden", marginBottom:12, aspectRatio:"4/3" }}>
              <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} playsInline muted autoPlay/>
              <div style={{ position:"absolute", left:"10%", right:"10%", top:"8%", bottom:"8%", borderRadius:"50%", border:`3px solid ${faceInFrame ? "#22c55e" : "#475569"}`, transition:"border-color 0.3s, box-shadow 0.3s", boxShadow: faceInFrame ? "0 0 20px rgba(34,197,94,0.55)" : "none", pointerEvents:"none" }}/>
              <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap" }}>
                <span style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"4px 12px", borderRadius:20, fontSize:11,
                  background: faceInFrame ? "rgba(21,128,61,0.88)" : "rgba(15,23,42,0.88)",
                  color: faceInFrame ? "#86efac" : "#94a3b8",
                  border:`1px solid ${faceInFrame ? "#166534" : "#334155"}`,
                }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: faceInFrame ? "#4ade80" : "#475569", display:"inline-block" }}/>
                  {selfieStatus}
                </span>
              </div>
            </div>
            {faceInFrame
              ? <button style={S.btn} onClick={captureSelfie}><Camera size={16}/> Capture</button>
              : <button style={{ ...S.btn, background:"var(--border)", color:"var(--text2)", cursor:"not-allowed" }} disabled>
                  <Camera size={16}/> Waiting for face…
                </button>
            }
          </>
        )}

        {step === "face-checking" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            {previewUrl && (
              <img src={previewUrl} alt="selfie" style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: 12, objectFit: "cover" }} />
            )}
            {!faceStatus && (
              <>
                <Loader size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", marginBottom: 8 }} />
                <p style={{ color: "var(--text2)", fontSize: 13 }}>Verifying face...</p>
              </>
            )}
            {faceStatus.startsWith("matched") && (
              <div style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:"var(--radius-xs)", padding:"10px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, color:"var(--green)", fontWeight:700, fontSize:14, marginBottom:4 }}>
                  <UserCheck size={18}/> Face Verified
                </div>
                <div style={{ fontSize:11, color:"var(--text2)", fontFamily:"monospace" }}>
                  Similarity: {faceStatus.split(":")[1]} (threshold &lt; 0.6)
                </div>
                <div style={{ fontSize:12, color:"var(--text2)", marginTop:4 }}>Logging checkpoint...</div>
              </div>
            )}
            {faceStatus === "no-face" && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius-xs)", padding:"10px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, color:"var(--red)", fontWeight:600, fontSize:13, marginBottom:8 }}>
                  <AlertTriangle size={15}/> No face detected
                </div>
                <p style={{ fontSize:12, color:"var(--text2)", marginBottom:10 }}>
                  Ensure your face is clearly visible and well lit.
                </p>
                <button
                  style={{ padding:"7px 16px", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-xs)", fontSize:12, fontWeight:700, cursor:"pointer" }}
                  onClick={() => { setFaceStatus(""); setSelfieBlob(null); setPreviewUrl(null); openCamera(); }}>
                  Retry
                </button>
              </div>
            )}
            {faceStatus.startsWith("no-match") && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius-xs)", padding:"10px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, color:"var(--red)", fontWeight:600, fontSize:13, marginBottom:4 }}>
                  <AlertTriangle size={15}/> Face does not match
                </div>
                <div style={{ fontSize:11, color:"var(--text2)", fontFamily:"monospace", marginBottom:6 }}>
                  Distance: {faceStatus.split(":")[1]} (must be &lt; 0.6)
                </div>
                <p style={{ fontSize:12, color:"var(--text2)" }}>Retrying camera in 3 seconds...</p>
              </div>
            )}
          </div>
        )}

        {step === "verifying" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            {previewUrl && (
              <img src={previewUrl} alt="selfie" style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: 12 }} />
            )}
            <Loader size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", marginBottom: 8 }} />
            <p style={{ color: "var(--text2)", fontSize: 13 }}>Saving checkpoint...</p>
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
  const [pendingSession, setPendingSession] = useState(null); // waiting for face capture

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
    setCreating(true);
    try {
      const res = await createPatrolSession(user?.gateName || "", user?.userName || "");
      if (res.success) {
        const tracked = { ...res.data, _date: date };
        localSessionsRef.current = [...localSessionsRef.current, tracked];
        // Show face capture before starting the patrol session
        setPendingSession(res.data);
      } else {
        setToast({ type: "error", msg: res.message || "Failed to create patrol session" });
      }
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to create patrol" });
    } finally { setCreating(false); }
  };

  const handleFaceCaptured = (descriptor) => {
    if (!pendingSession) return;
    setActiveSession({ ...pendingSession, faceDescriptor: descriptor });
    setPendingSession(null);
  };

  const handleFaceSkipped = () => {
    if (!pendingSession) return;
    setActiveSession(pendingSession);
    setPendingSession(null);
  };

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

  if (pendingSession) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <FaceCaptureModal onCapture={handleFaceCaptured} onSkip={handleFaceSkipped} />
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
