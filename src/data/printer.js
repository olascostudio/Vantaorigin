// The print partner's side.
import { api } from "./api";

export const loadInvite = (token) => api.get(`/print/invite/${encodeURIComponent(token)}`);

export const acceptInvite = (token, body) =>
  api.post(`/print/invite/${encodeURIComponent(token)}/accept`, body);

export const loadMyPrinter = () => api.get("/me/printer");

export const loadJobs = () => api.get("/me/printer/orders");

export const moveJob = (publicId, body) =>
  api.patch(`/me/printer/orders/${encodeURIComponent(publicId)}`, body);

// An address, as a courier reads it: one line at a time, no commas doing
// the work of line breaks.
export const addressLines = (job) =>
  [
    job.address?.line1,
    job.address?.line2,
    job.address?.city,
    job.region,
    job.address?.postcode,
    job.countryCode,
  ].filter(Boolean);
