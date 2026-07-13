import api from "./api";

export const getPatrolLogs    = (date) => api.get(`/patrol?date=${date}`).then(r => r.data);
export const markCheckpoint   = (data) => api.post("/patrol", data).then(r => r.data);
