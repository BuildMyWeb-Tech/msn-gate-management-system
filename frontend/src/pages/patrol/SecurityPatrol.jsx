import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getPatrolSessions, createPatrolSession, endPatrolSession,
  getSessionCheckpoints, validatePatrolPoint, logSessionCheckpoint,
} from "../../services/patrolService";
import Toast from "../../components/Toast";
import { Shield, Camera, MapPin, RefreshCw, ChevronLeft, Loader } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];

const fmtTime = v => {
  if (!v) return "—";
  try { return new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return v; }
};

const fmtDate = v => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return v; }
};

// ─── Validate Patrol Point Modal ─────────────────────────────────────────────
function ValidateModal({ session, onClose, onSuccess, setToast }) {
  const [step, setStep]           = useState("locating"); // locating | found | selfie | verifying
  const [foundPoint, setFoundPoint] = useState(null);
  const [stream, setStream]       = useState(null);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  // Step 1 — GPS validation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setToast({ type: "error", msg: "GPS not supported on this device" });
      onClose();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await validatePatrolPoint(lat, lng);
          if (res.success && res.data) {
            setFoundPoint(res.data);
            setStep("found");
          } else {
            setToast({ type: "error", msg: res.message || "No patrol point found within 6 metres" });
            onClose();
          }
        } catch (err) {
          setToast({ type: "error", msg: err.response?.data?.message || "Location validation failed" });
          onClose();
        }
      },
      err => {
        const msgs = { 1: "Location permission denied", 2: "Location unavailable", 3: "Location request timed out" };
        setToast({ type: "error", msg: msgs[err.code] || "Failed to get GPS location" });
        onClose();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []); // eslint-disable-line

  // Step 2 — Open camera when user clicks "Take Selfie"
  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(s);
      setStep("selfie");
    } catch {
      setToast({ type: "error", msg: "Camera access denied. Please allow camera permission." });
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const stopStream = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  useEffect(() => () => stopStream(), [stopStream]);

  // Capture selfie
  const captureSelfie = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setSelfieBlob(blob);
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.85));
      stopStream();
      setStep("verifying");
      submitCheckpoint(blob);
    }, "image/jpeg", 0.85);
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
          onSuccess(res.data);
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
            <p style={{ color: "var(--text2)", fontSize: 13 }}>Getting GPS location...</p>
          </div>
        )}

        {(step === "found" || step === "selfie" || step === "verifying") && (
          <>
            <div style={S.label}>Patrol Point</div>
            <div style={S.pointBox}>
              <MapPin size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              {foundPoint?.name}
            </div>
          </>
        )}

        {step === "found" && (
          <button style={S.btn} onClick={openCamera}>
            <Camera size={16} /> Take Selfie
          </button>
        )}

        {step === "selfie" && (
          <>
            <video ref={videoRef} style={S.video} playsInline muted autoPlay />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <button style={S.btn} onClick={captureSelfie}>
              <Camera size={16} /> Capture
            </button>
          </>
        )}

        {step === "verifying" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            {previewUrl && (
              <img src={previewUrl} alt="selfie" style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: 12 }} />
            )}
            <Loader size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", marginBottom: 8 }} />
            <p style={{ color: "var(--text2)", fontSize: 13 }}>Verifying identity...</p>
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
    // Reload checkpoints to get server-assigned SlNo and timestamp
    loadCheckpoints();
    setToast({ type: "success", msg: "Patrol point validated successfully" });
  };

  const handleEndPatrol = async () => {
    setEnding(true);
    try {
      await endPatrolSession(session.uid);
      setToast({ type: "success", msg: "Patrol ended" });
      onBack(true); // true = refresh list
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
          <div style={{ padding: "14px 16px" }}>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPatrolSessions(date, user?.gateId || 0);
      setSessions(res.data || []);
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
        setActiveSession(res.data);
      } else {
        setToast({ type: "error", msg: res.message || "Failed to create patrol session" });
      }
    } catch (err) {
      setToast({ type: "error", msg: err.response?.data?.message || "Failed to create patrol" });
    } finally { setCreating(false); }
  };

  const handleSessionRow = (session) => setActiveSession(session);

  const handleBackFromSession = (refresh) => {
    setActiveSession(null);
    if (refresh) load();
  };

  const S = {
    th: { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text2)", textAlign: "left", background: "var(--surface2)", borderBottom: "1px solid var(--border)" },
    td: { padding: "10px 12px", fontSize: 13, color: "var(--text)", borderBottom: "1px solid var(--border)", cursor: "pointer" },
  };

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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: "var(--text3)", cursor: "default" }}>
                  <div style={{ padding: "20px 0" }}>Loading...</div>
                </td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: "var(--text3)", cursor: "default" }}>
                  <div style={{ padding: "20px 0" }}>
                    <Shield size={28} style={{ color: "var(--text3)", marginBottom: 8 }} />
                    <div>No patrol sessions for {fmtDate(date)}</div>
                  </div>
                </td></tr>
              ) : sessions.map((s, i) => (
                <tr key={s.uid ?? i} onClick={() => handleSessionRow(s)}
                  style={{ transition: "background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={S.td}>
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>{s.patrolId || s.PatrolID || `#${s.uid}`}</span>
                  </td>
                  <td style={S.td}>{s.securityName || s.SecurityName || "—"}</td>
                  <td style={S.td}>{fmtTime(s.startTime || s.StartTime)}</td>
                  <td style={S.td}>{s.endTime || s.EndTime ? fmtTime(s.endTime || s.EndTime) : <span style={{ color: "var(--green)", fontSize: 11, fontWeight: 600 }}>Active</span>}</td>
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
