// A creator's own subscribers.
//
// Every one of these answers for the signed in account and no other. There
// is no creator id to pass, which is the point: there is nothing to get
// wrong here, and nothing a browser could change to ask about somebody else.
import { API_BASE, api } from "./api";

export const loadOverview = () => api.get("/me/creator/overview");

export const loadSubscribers = ({ q = "", page = 1, limit = 25 } = {}) =>
  api.get(
    `/me/creator/subscribers?page=${page}&limit=${limit}` + (q ? `&q=${encodeURIComponent(q)}` : "")
  );

export const loadActivity = () => api.get("/me/creator/activity");

export const loadInterest = () => api.get("/me/creator/interest");
export const registerInterest = (feature) => api.post("/me/creator/interest", { feature });

// The download is a file, not JSON, so it goes to the browser rather than
// through the JSON helper. The session cookie travels with it.
export const subscribersFileUrl = () => `${API_BASE}/me/creator/subscribers.csv`;

// The rules a creator agrees to before being shown anybody's address.
export const loadCreatorTerms = () => api.get("/me/creator/terms");

// The version is named by whoever is agreeing, so nobody ends up recorded
// as having accepted a document that changed while the page was open.
export const acceptCreatorTerms = (version) =>
  api.post("/me/creator/terms/accept", { version });
