import api from "./api";

export const getVisitors       = (date, gateId = 0) =>
  api.get(`/visitors?date=${date}&gateId=${gateId}`).then(r => r.data);

export const getVisitorById    = (id) =>
  api.get(`/visitors/${id}`).then(r => r.data);

export const getVisitorByMobile = (mobile) =>
  api.get(`/visitors/mobile/${mobile}`).then(r => r.data);

export const searchVisitors    = (q) =>
  api.get(`/visitors/search?q=${encodeURIComponent(q)}`).then(r => r.data);

export const createVisitor     = (body) =>
  api.post("/visitors", body).then(r => r.data);

export const updateVisitor     = (id, body) =>
  api.put(`/visitors/${id}`, body).then(r => r.data);

export const markVisitorOut    = (id, body = {}) =>
  api.patch(`/visitors/${id}/out`, body).then(r => r.data);

export const deleteVisitor     = (id) =>
  api.delete(`/visitors/${id}`).then(r => r.data);