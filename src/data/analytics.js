// Counting visitors, without following them.
//
// Cloudflare Web Analytics: one small script, no cookies, no identifiers, no
// cross-site profile. That matters beyond principle -- analytics that set
// cookies need a consent banner before they may run in Europe, and a banner
// is a thing every visitor must dismiss before they see the site. This needs
// none, so there is nothing in anybody's way.
//
// It is also free and uncapped, which the obvious alternatives are not: the
// free tiers that count events stop counting part way through exactly the
// week worth measuring.
//
// Nothing loads until VITE_ANALYTICS_TOKEN is set, so a laptop and a preview
// build stay out of the numbers.
const BEACON = "https://static.cloudflareinsights.com/beacon.min.js";

export function countVisits({
  token = import.meta.env.VITE_ANALYTICS_TOKEN,
  host = typeof window === "undefined" ? "" : window.location.hostname,
  doc = typeof document === "undefined" ? null : document,
} = {}) {
  if (!token || !doc) return null;

  // Only the real site. A preview deployment or a laptop sharing the token
  // would otherwise be counted as visitors.
  if (host !== "vantaorigin.com" && !host.endsWith(".vantaorigin.com")) return null;

  // Hot reloading would otherwise add one of these per save.
  if (doc.querySelector(`script[src="${BEACON}"]`)) return null;

  const script = doc.createElement("script");
  script.src = BEACON;
  script.defer = true;
  script.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  doc.head.appendChild(script);
  return script;
}
