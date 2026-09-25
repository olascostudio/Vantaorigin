// The dashboard's reading list. Everything here is refused unless the signed
// in account is named in the API's ADMIN_EMAILS setting.
import { api } from "./api";

// Answered for anyone: false for an ordinary creator, and for a visitor.
export const amIAdmin = () =>
  api
    .get("/admin/me")
    .then((answer) => Boolean(answer?.admin))
    .catch(() => false);

export const loadOverview = () => api.get("/admin/overview");
export const loadCreators = (limit = 50) => api.get(`/admin/creators?limit=${limit}`);
export const loadTopCharacters = (limit = 20) => api.get(`/admin/characters?limit=${limit}`);
export const loadReports = (status = "open") => api.get(`/admin/reports?status=${status}`);
export const settleReport = (id, status) => api.patch(`/admin/reports/${id}`, { status });
