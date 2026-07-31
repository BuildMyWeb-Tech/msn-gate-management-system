// frontend/src/services/visitorService.js
import api from './api';

export const getVisitors = (date) => api.get(`/visitors?date=${date}`).then((r) => r.data);
export const createVisitor = (body) => api.post('/visitors', body).then((r) => r.data);
export const updateVisitor = (id, body) => api.put(`/visitors/${id}`, body).then((r) => r.data);
export const markVisitorOut = (id, body = {}) =>
  api.patch(`/visitors/${id}/out`, body).then((r) => r.data);
export const deleteVisitor = (id) => api.delete(`/visitors/${id}`).then((r) => r.data);
