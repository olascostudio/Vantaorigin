// The dashboard's reading list. Everything here is refused unless the signed
// in account is named in the API's ADMIN_EMAILS setting.
import { API_BASE, api } from "./api";

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

// The newsletter list. `q` searches inside the address; `status` narrows to
// who is still on it.
export const loadSubscribers = ({ q = "", status = "all", limit = 100, offset = 0 } = {}) =>
  api.get(
    `/admin/newsletter?status=${status}&limit=${limit}&offset=${offset}` +
      (q ? `&q=${encodeURIComponent(q)}` : "")
  );

export const setSubscriberStatus = (id, status) => api.patch(`/admin/newsletter/${id}`, { status });
export const forgetSubscriber = (id) => api.delete(`/admin/newsletter/${id}`);

// The download is a file, not JSON, so it goes straight to the browser rather
// than through the JSON helper. The session cookie travels with it.
export const subscribersFileUrl = (status = "subscribed") =>
  `${API_BASE}/admin/newsletter.csv?status=${status}`;
