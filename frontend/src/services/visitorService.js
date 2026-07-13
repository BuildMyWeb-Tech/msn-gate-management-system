import api from "./api";

export const getVisitors  = (date) => api.get(`/visitors?date=${date}`).then(r => r.data);
export const getVisitorByMobile = (mobile) => api.get(`/visitors/mobile/${mobile}`).then(r => r.data);
export const getVisitorById     = (id)     => api.get(`/visitors/${id}`).then(r => r.data);
export const createVisitor      = (data)   => api.post("/visitors", data).then(r => r.data);
export const updateVisitor      = (id, data) => api.put(`/visitors/${id}`, data).then(r => r.data);
export const markVisitorOut     = (id)     => api.patch(`/visitors/${id}/out`).then(r => r.data);
