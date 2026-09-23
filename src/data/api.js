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
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, headers } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      // the session cookie rides along
      credentials: "include",
      headers: body instanceof FormData ? headers : { "Content-Type": "application/json", ...headers },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach VantaOrigin. Check your connection.", 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || "Something went wrong", response.status);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  upload: (path, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(path, { method: "POST", body: form });
  },
};
