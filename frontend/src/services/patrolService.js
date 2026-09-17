import api from "./api";

export const getPatrolLogs    = (date) => api.get(`/patrol?date=${date}`).then(r => r.data);
export const markCheckpoint   = (data) => api.post("/patrol", data).then(r => r.data);

// Patrol Sessions (new flow)
export const getPatrolSessions    = (date, gateId = 0) =>
  api.get(`/patrol/sessions?date=${date}&gateId=${gateId}`).then(r => r.data);

export const createPatrolSession  = (gateName, securityName) =>
  api.post("/patrol/sessions", { gateName, securityName }).then(r => r.data);

export const endPatrolSession     = (uid) =>
  api.put(`/patrol/sessions/${uid}/end`).then(r => r.data);

export const getSessionCheckpoints = (uid) =>
  api.get(`/patrol/sessions/${uid}/checkpoints`).then(r => r.data);

// GPS validation
export const validatePatrolPoint  = (lat, lng) =>
  api.post("/patrol/validate-point", { lat, lng }).then(r => r.data);

// Log verified checkpoint (location + selfie)
export const logSessionCheckpoint = (uid, data) =>
  api.post(`/patrol/sessions/${uid}/checkpoint`, data).then(r => r.data);
