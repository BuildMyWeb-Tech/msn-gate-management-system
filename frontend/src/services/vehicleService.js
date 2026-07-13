import api from "./api";

export const getVehicles   = (date)     => api.get(`/vehicles?date=${date}`).then(r => r.data);
export const getVehicleById= (id)       => api.get(`/vehicles/${id}`).then(r => r.data);
export const createVehicle = (data)     => api.post("/vehicles", data).then(r => r.data);
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data).then(r => r.data);
export const markVehicleOut= (id)       => api.patch(`/vehicles/${id}/out`).then(r => r.data);
