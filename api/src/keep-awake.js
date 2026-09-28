// Keeping the service on its feet.
//
// The host puts a free service to sleep after fifteen idle minutes and takes
// the better part of a minute to wake. A crawler asking for a link preview
// gives up long before that, so a character shared while the service naps
// previews as nothing at all.
//
// This was a scheduled job on GitHub until its own records showed it had run
// not once in a day: GitHub throttles schedules hard — the sync beside it
// asks for every fifteen minutes and gets one run every two to six hours. So
// the service knocks on its own front door instead. The request goes out to
// the public address and arrives back through the load balancer, which is
// what the host counts as traffic.
const MINUTES = 10;

export function startKeepAwake({
  url,
  enabled,
  minutes = MINUTES,
  fetchImpl = fetch,
  setIntervalImpl = setInterval,
} = {}) {
  if (!enabled || !url) return null;

  const target = `${String(url).replace(/\/$/, "")}/health`;

  const timer = setIntervalImpl(() => {
    // A missed knock means nothing; the next one is ten minutes away.
    Promise.resolve(fetchImpl(target, { signal: AbortSignal.timeout(30_000) })).catch(() => {});
  }, minutes * 60_000);

  // Never hold the process open on account of this.
  timer?.unref?.();
  return timer;
}
