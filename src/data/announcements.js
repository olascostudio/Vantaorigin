// Something said to everybody at once. Admin only; every one of these is
// refused with a 404 for anybody else, so the screen never has to guess.
import { api } from "./api";

export const loadAnnouncements = () => api.get("/admin/broadcasts");
export const loadAnnouncement = (id) => api.get(`/admin/broadcasts/${id}`);
export const startAnnouncement = (writing = {}) => api.post("/admin/broadcasts", writing);
export const saveAnnouncement = (id, writing) => api.patch(`/admin/broadcasts/${id}`, writing);
export const discardAnnouncement = (id) => api.delete(`/admin/broadcasts/${id}`);

export const previewAnnouncement = (id) => api.get(`/admin/broadcasts/${id}/preview`);
export const audienceFor = (id) => api.get(`/admin/broadcasts/${id}/audience`);
export const testAnnouncement = (id, to) =>
  api.post(`/admin/broadcasts/${id}/test`, to ? { to } : {});

// The count is sent back with the press. If it no longer matches what the
// screen was showing, the API refuses rather than sending the difference on
// somebody's behalf.
export const sendAnnouncement = (id, audienceCount) =>
  api.post(`/admin/broadcasts/${id}/send`, { audienceCount });
