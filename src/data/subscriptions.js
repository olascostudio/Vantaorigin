// Subscribing to a creator, from the browser's side.
import { api } from "./api";

const handle = (username) => encodeURIComponent(String(username).replace(/^@/, ""));

export const loadSubscription = (username) =>
  api.get(`/public/creators/${handle(username)}/subscription`);

export const subscribeTo = (username) =>
  api.post(`/public/creators/${handle(username)}/subscribe`, {});

export const unsubscribeFrom = (username) =>
  api.delete(`/public/creators/${handle(username)}/subscribe`);

export const mySubscriptions = () => api.get("/me/subscriptions");

// Somebody who pressed Subscribe while signed out.
//
// Kept in sessionStorage rather than in the address, for two reasons. It has
// to survive sign up, then the verification screen, then wherever that
// screen sends them, and threading a return path through three screens that
// each navigate differently is three chances to lose it. And it is gone when
// the tab closes, which is the right lifetime for an intention nobody
// completed.
//
// Every read and write is wrapped: a private window, or blocked site data,
// throws rather than returning nothing, and the button has to keep working
// either way. Losing it is a small cost, so none of this is load bearing.
const KEY = "vantaorigin.pending-subscribe";

export const rememberIntent = (username) => {
  try {
    sessionStorage.setItem(KEY, String(username).replace(/^@/, ""));
  } catch {
    // Nothing to do. They will simply land on the page and press it again.
  }
};

export const readIntent = () => {
  try {
    return sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
};

export const forgetIntent = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Already gone, as far as anybody can tell.
  }
};
