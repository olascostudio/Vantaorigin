// Every call to our own backend goes through here. The address comes from
// VITE_API_URL, so pointing the app at a laptop, managed hosting or a VPS is
// a build-time setting, not a code change.
// On vantaorigin.com the API is always api.vantaorigin.com, so the live site
// never depends on a build-time setting being right. Anywhere else (a preview
// build, a laptop) VITE_API_URL decides, falling back to the local API.
function apiBase() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  if (host === "vantaorigin.com" || host.endsWith(".vantaorigin.com")) {
    return "https://api.vantaorigin.com";
  }
  return import.meta.env.VITE_API_URL || "http://localhost:8080";
}

const BASE = apiBase().replace(/\/$/, "");

export class ApiError extends Error {
  // The whole answer is kept, so a caller can read anything the API added
  // alongside the message -- how long to wait before asking again, say.
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = "GET", body, headers } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      // the session cookie rides along
      credentials: "include",
      // never a cached copy: deletions must be visible on every device
      cache: "no-store",
      // Only claim a JSON body when there is one: a JSON content-type with an
      // empty body is rejected, which silently broke every DELETE.
      headers:
        body instanceof FormData || body === undefined
          ? headers
          : { "Content-Type": "application/json", ...headers },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach VantaOrigin. Check your connection.", 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || "Something went wrong", response.status, data);
  return data;
}

// The hosting plan puts the API to sleep after 15 minutes idle, and waking it
// takes the better part of a minute. Asking for /health as soon as the page
// opens means it wakes while someone is still reading, rather than when they
// press Sign in. Failures are irrelevant here.
export function wakeApi() {
  fetch(`${BASE}/health`, { cache: "no-store" }).catch(() => {});
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path, body) => request(path, { method: "DELETE", body }),
  upload: (path, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(path, { method: "POST", body: form });
  },
};
