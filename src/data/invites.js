// Inviting a print partner, from the admin's side.
import { api } from "./api";

export const createInvite = (printerId, email) =>
  api.post(`/admin/distribution/printers/${printerId}/invite`, { email });

export const listInvites = (printerId) =>
  api.get(`/admin/distribution/printers/${printerId}/invites`);

export const revokeInvite = (id) => api.post(`/admin/distribution/invites/${id}/revoke`, {});
