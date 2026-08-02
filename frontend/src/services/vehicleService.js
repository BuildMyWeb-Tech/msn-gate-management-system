import api from "./api";

export const getVehicles    = (date)        => api.get(`/vehicles?date=${date}`).then(r => r.data);
export const getVehicleById = (id)          => api.get(`/vehicles/${id}`).then(r => r.data);
export const createVehicle  = (body)        => api.post("/vehicles", body).then(r => r.data);
export const updateVehicle  = (id, body)    => api.put(`/vehicles/${id}`, body).then(r => r.data);
export const markVehicleOut = (id, body={}) => api.patch(`/vehicles/${id}/out`, body).then(r => r.data);
export const deleteVehicle  = (id)          => api.delete(`/vehicles/${id}`).then(r => r.data);