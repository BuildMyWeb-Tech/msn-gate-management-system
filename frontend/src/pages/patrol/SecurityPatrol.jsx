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

// Mobile detection — file input capture="user" on mobile, getUserMedia on desktop
const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);

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
// Mobile/PWA: <input capture="user"> opens native front camera (no getUserMedia).
// Desktop: getUserMedia live video preview → capture frame.
function FaceCaptureModal({ onCapture, onSkip }) {
  const [step, setStep]         = useState("idle"); // idle | loading | camera | captured | processing
  const [stream, setStream]     = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError]       = useState("");
  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);

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

  const openCamera = async () => {
    setError("");
    if (isMobile) {
      // Mobile/PWA: trigger native camera via file input — no getUserMedia needed
      fileInputRef.current?.click();
      return;
    }
    // Desktop: getUserMedia live video
    setStep("loading");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(s);
      setStep("camera");
      loadFaceModels().catch(err => console.warn("[FaceCapture] Model load:", err.message));
    } catch (e) {
      let msg;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
        msg = "Camera permission denied — allow in browser settings and retry";
      else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError")
        msg = "No camera found on this device";
      else if (e.name === "NotReadableError" || e.name === "TrackStartError" || e.name === "AbortError")
        msg = "Camera in use by another app — close it and retry";
      else
        msg = `Could not open camera — ${e.message || e.name}`;
      setError(msg);
      setStep("idle");
    }
  };

  // Mobile: file selected from native camera
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("captured");
    setError("");
  };

  // Desktop: capture frame from live video
  const captureFromVideo = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    stopStream();
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.85));
    setStep("captured");
  };

  const processCapture = async () => {
    if (!previewUrl) return;
    setStep("processing");
    setError("");
    try {
      await loadFaceModels();
      const canvas = canvasRef.current;
      // For mobile blob URLs: load image into canvas; for desktop: canvas already has the frame
      if (previewUrl.startsWith("blob:")) {
        const img = new Image();
        img.src = previewUrl;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        canvas.width  = img.naturalWidth  || 640;
        canvas.height = img.naturalHeight || 480;
        canvas.getContext("2d").drawImage(img, 0, 0);
      }
      const descriptor = await getFaceDescriptor(canvas);
      if (!descriptor) {
        setError("No face detected — retake in good lighting, facing the camera");
        setStep("captured");
      } else {
        onCapture(descriptor);
      }
    } catch {
      setError("Face analysis failed — please try again");
      setStep("captured");
    }
  };

  const retake = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStep("idle");
    setError("");
    openCamera();
  };

  const S = {
    overlay: { position:"fixed", inset:0, zIndex:800, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
    box: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", width:"min(380px,95vw)", padding:20 },
    title: { fontWeight:700, fontSize:15, color:"var(--text)", textAlign:"center", marginBottom:4 },
    sub: { fontSize:12, color:"var(--text2)", textAlign:"center", marginBottom:16 },
    btn: { width:"100%", padding:"11px 0", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
    btnGhost: { width:"100%", padding:"9px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:12, cursor:"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
    skip: { width:"100%", padding:"9px 0", background:"none", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:12, cursor:"pointer" },
    video: { width:"100%", borderRadius:"var(--radius-sm)", marginBottom:12, background:"#000", aspectRatio:"4/3" },
  };

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        {/* hidden file input — used on mobile/PWA only; capture="user" = front camera */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="user"
          style={{ display:"none" }} onChange={handleFileChange} />
        <canvas ref={canvasRef} style={{ display:"none" }}/>

        <div style={{ textAlign:"center", marginBottom:12 }}>
          <UserCheck size={28} style={{ color:"var(--accent)" }}/>
        </div>
        <div style={S.title}>Face Registration</div>
        <div style={S.sub}>Take a selfie to verify your identity at each patrol point.</div>

        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius-xs)", marginBottom:12, fontSize:12, color:"var(--red)" }}>
            <AlertTriangle size={13}/> {error}
          </div>
        )}

        {(step === "idle" || step === "loading") && (
          <>
            <button style={S.btn} onClick={openCamera} disabled={step === "loading"}>
              {step === "loading"
                ? <><Loader size={15} style={{ animation:"spin 1s linear infinite" }}/> Starting camera...</>
                : <><Camera size={15}/> Open Camera</>}
            </button>
            <button style={S.skip} onClick={onSkip}>Skip (no face verification)</button>
          </>
        )}

        {step === "camera" && (
          <>
            <video ref={videoRef} style={S.video} playsInline muted autoPlay/>
            <button style={S.btn} onClick={captureFromVideo}>
              <Camera size={15}/> Capture Face
            </button>
          </>
        )}

        {step === "captured" && previewUrl && (
          <>
            <img src={previewUrl} alt="selfie preview"
              style={{ width:"100%", borderRadius:"var(--radius-sm)", marginBottom:12, objectFit:"cover", aspectRatio:"4/3" }}/>
            <button style={S.btn} onClick={processCapture}>
              <UserCheck size={15}/> Use This Photo
            </button>
            <button style={S.btnGhost} onClick={retake}>
              <Camera size={14}/> Retake
            </button>
          </>
        )}

        {step === "processing" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <Loader size={24} style={{ color:"var(--accent)", animation:"spin 1s linear infinite", marginBottom:8 }}/>
            <p style={{ color:"var(--text2)", fontSize:13 }}>Detecting face...</p>
          </div>
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
  const [faceStatus, setFaceStatus] = useState(""); // "" | "matched" | "no-match" | "no-face"
  const [gpsProgress, setGpsProgress] = useState(0); // 0-3 (shows Reading n/3)
  const [capturedCoords, setCapturedCoords] = useState(null); // { lat, lng } — temp debug display
  const selfieInputRef    = useRef(null); // mobile: hidden file input for selfie
  const videoRef          = useRef(null); // desktop: live camera preview
  const capturedCanvasRef = useRef(null); // holds snapshot for face comparison

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

  // Step 2 — Open camera when user clicks "Take Selfie"
  const openCamera = async () => {
    setFaceStatus("");
    if (isMobile) {
      // Mobile/PWA: native camera via file input
      selfieInputRef.current?.click();
      return;
    }
    // Desktop: getUserMedia live video
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(s);
      setStep("selfie");
    } catch (e) {
      let msg;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
        msg = "Camera permission denied — allow in browser settings";
      else if (e.name === "NotFoundError")
        msg = "No camera found on this device";
      else if (e.name === "NotReadableError" || e.name === "TrackStartError" || e.name === "AbortError")
        msg = "Camera in use by another app — close it and retry";
      else
        msg = `Could not open camera — ${e.message || e.name}`;
      setToast({ type: "error", msg });
    }
  };

  // Desktop: capture selfie frame from live video
  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
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

  // Mobile: file selected from native camera
  const handleSelfieFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep("face-checking");

    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {});

    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth  || 640;
    canvas.height = img.naturalHeight || 480;
    canvas.getContext("2d").drawImage(img, 0, 0);
    capturedCanvasRef.current = canvas;

    canvas.toBlob(blob => {
      setSelfieBlob(blob);
      const refDescriptor = session?.faceDescriptor;
      if (refDescriptor) { verifyFace(refDescriptor, blob); }
      else { setStep("verifying"); submitCheckpoint(blob); }
    }, "image/jpeg", 0.85);
  };

  const verifyFace = async (refDescriptor, blob) => {
    try {
      const snapshotCanvas = capturedCanvasRef.current;
      if (!snapshotCanvas) { setStep("verifying"); submitCheckpoint(blob); return; }

      const selfieDescriptor = await getFaceDescriptor(snapshotCanvas);
      if (!selfieDescriptor) {
        setFaceStatus("no-face");
        return; // stays on face-checking step with error shown
      }

      const distance = faceapi.euclideanDistance(refDescriptor, selfieDescriptor);
      if (distance < 0.6) {
        setFaceStatus("matched");
        setTimeout(() => { setStep("verifying"); submitCheckpoint(blob); }, 800);
      } else {
        setFaceStatus("no-match");
        // Allow retry after 2 seconds by going back to selfie step
        setTimeout(() => {
          setFaceStatus("");
          setSelfieBlob(null);
          setPreviewUrl(null);
          openCamera();
        }, 2500);
      }
    } catch {
      // On error, proceed without blocking
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
        {/* hidden file input — capture="user" opens front camera on mobile/PWA */}
        <input
          ref={selfieInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display:"none" }}
          onChange={handleSelfieFile}
        />

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
            <video ref={videoRef} style={S.video} playsInline muted autoPlay/>
            <button style={S.btn} onClick={captureSelfie}>
              <Camera size={16}/> Capture
            </button>
          </>
        )}

        {step === "face-checking" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            {previewUrl && (
              <img src={previewUrl} alt="selfie" style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: 12 }} />
            )}
            {!faceStatus && (
              <>
                <Loader size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", marginBottom: 8 }} />
                <p style={{ color: "var(--text2)", fontSize: 13 }}>Verifying face...</p>
              </>
            )}
            {faceStatus === "matched" && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, color:"var(--green)", fontWeight:600, fontSize:13 }}>
                <UserCheck size={18}/> Face matched — logging checkpoint...
              </div>
            )}
            {faceStatus === "no-face" && (
              <div style={{ color:"var(--red)", fontSize:13 }}>
                <AlertTriangle size={16} style={{ marginRight:6 }}/>
                No face detected. Please try again in better lighting.
                <br/>
                <button style={{ marginTop:10, padding:"7px 16px", background:"var(--accent)", color:"#000", border:"none", borderRadius:"var(--radius-xs)", fontSize:12, fontWeight:700, cursor:"pointer" }}
                  onClick={() => { setFaceStatus(""); setSelfieBlob(null); setPreviewUrl(null); openCamera(); }}>
                  Retry
                </button>
              </div>
            )}
            {faceStatus === "no-match" && (
              <div style={{ color:"var(--red)", fontSize:13 }}>
                <AlertTriangle size={16} style={{ marginRight:6 }}/>
                Face does not match. Retrying camera...
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
