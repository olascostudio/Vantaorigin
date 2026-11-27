// Creator Studio access.
import { api } from "./api";

export const amIInStudio = () => api.get("/me/studio");

export const loadStudioInvite = (token) =>
  api.get(`/studio/invite/${encodeURIComponent(token)}`);

export const acceptStudioInvite = (token, body) =>
  api.post(`/studio/invite/${encodeURIComponent(token)}/accept`, body);

export const createStudioInvite = (email, note) =>
  api.post("/admin/studio-invites", { email, ...(note ? { note } : {}) });

export const listStudioInvites = () => api.get("/admin/studio-invites");

export const revokeStudioInvite = (id) => api.post(`/admin/studio-invites/${id}/revoke`, {});
