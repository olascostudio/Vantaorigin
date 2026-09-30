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

// Writing the newsletter. A draft is kept as blocks, so the preview below is
// built the same way the real email will be.
export const loadIssues = () => api.get("/admin/newsletter/issues");
export const loadIssue = (id) => api.get(`/admin/newsletter/issues/${id}`);
export const startIssue = (writing = {}) => api.post("/admin/newsletter/issues", writing);
export const saveIssue = (id, writing) => api.patch(`/admin/newsletter/issues/${id}`, writing);
export const discardIssue = (id) => api.delete(`/admin/newsletter/issues/${id}`);
export const previewIssue = (writing) => api.post("/admin/newsletter/preview", writing);

// Sending. A test copy changes nothing; the real send answers at once and
// works through the list in the background, so the screen watches the counts.
export const sendTestCopy = (id, to) =>
  api.post(`/admin/newsletter/issues/${id}/test`, to ? { to } : {});
export const countWaiting = (id) => api.get(`/admin/newsletter/issues/${id}/waiting`);
export const sendIssue = (id) => api.post(`/admin/newsletter/issues/${id}/send`, {});

// Posting the welcome letter again to somebody who never got one.
export const resendWelcome = (to) => api.post("/admin/welcome", { to });
