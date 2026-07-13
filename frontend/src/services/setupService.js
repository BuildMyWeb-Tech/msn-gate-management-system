import api from "./api";

export const getSetup      = (type, tag=1)     => api.get(`/setup/${type}?tag=${tag}`).then(r => r.data);
export const getDropdown   = (type)            => api.get(`/setup/${type}/dropdown`).then(r => r.data);
export const createSetup   = (type, data)      => api.post(`/setup/${type}`, data).then(r => r.data);
export const updateSetup   = (type, id, data)  => api.put(`/setup/${type}/${id}`, data).then(r => r.data);
export const deleteSetup   = (type, id)        => api.delete(`/setup/${type}/${id}`).then(r => r.data);
export const restoreSetup  = (type, id)        => api.patch(`/setup/${type}/${id}/restore`).then(r => r.data);
