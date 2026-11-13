// Proving a webhook came from the sender.
//
// This endpoint may take an address off the list for good. That makes it the
// one route on the API where an unauthenticated stranger can stop somebody
// else's mail, so nothing is believed without a signature, and there is no
// path through here that skips the check.
//
// Resend signs through Svix. The scheme, from Svix's own documentation:
//
//   signed content = `${svix-id}.${svix-timestamp}.${raw body}`
//   HMAC-SHA256, base64 encoded
//   key = base64-decode(secret without its `whsec_` prefix)
//   header `svix-signature` holds space-separated `v1,<base64>` entries
//
// The body has to be the exact bytes that arrived. Parsing JSON and
// re-serialising it changes key order and whitespace, and the signature is
// over the text, not the meaning -- which is why the route reads this one
// content type as a string.
import { createHmac, timingSafeEqual } from "node:crypto";

// How old a webhook may be and still be acted on.
//
// Svix's documentation says to check the timestamp "within your tolerance"
// and names no number, so this is ours, not theirs. Five minutes is long
// enough to survive a slow boot on a free plan and short enough that a
// captured request is not worth replaying later.
export const TOLERANCE_SECONDS = 300;

const keyFrom = (secret) => {
  const body = String(secret).startsWith("whsec_") ? String(secret).slice(6) : String(secret);
  return Buffer.from(body, "base64");
};

// Length-independent, so a comparison never reveals how much of a guess was
// right. timingSafeEqual throws on a length mismatch, which would itself be
// a timing signal, so the lengths are checked first and a mismatch simply
// loses.
const sameSignature = (a, b) => {
  const left = Buffer.from(a, "base64");
  const right = Buffer.from(b, "base64");
  return left.length === right.length && timingSafeEqual(left, right);
};

// Null when the request is genuine; a sentence saying why not otherwise.
//
// The sentence is for the log. None of it is ever sent back to whoever
// knocked: telling an unsigned caller which part of their forgery was wrong
// is telling them how to fix it.
export function whyNotSigned({
  secret,
  id,
  timestamp,
  signature,
  body,
  now = Date.now(),
  toleranceSeconds = TOLERANCE_SECONDS,
}) {
  // No secret means no way to tell a real event from a made-up one. Refusing
  // is the only safe reading: treating "unconfigured" as "allow" would turn
  // a missing environment variable into an open door.
  if (!secret) return "no webhook secret is configured";
  if (!id || !timestamp || !signature) return "a signature header is missing";

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return "the timestamp is not a number";

  const drift = Math.abs(now / 1000 - sent);
  if (drift > toleranceSeconds) {
    return `the timestamp is ${Math.round(drift)}s away, outside the ${toleranceSeconds}s window`;
  }

  const expected = createHmac("sha256", keyFrom(secret))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");

  // The header may carry several, because a secret being rotated means both
  // the old and the new one are signed for a while. Any one matching is a
  // genuine request.
  const offered = String(signature)
    .split(" ")
    .filter(Boolean)
    .map((entry) => {
      const comma = entry.indexOf(",");
      return comma < 0 ? entry : entry.slice(comma + 1);
    });

  if (!offered.length) return "the signature header holds no signatures";

  for (const candidate of offered) {
    try {
      if (sameSignature(expected, candidate)) return null;
    } catch {
      // A candidate that is not base64 is simply not a match.
    }
  }

  return "no signature matched";
}

// What this event is about, taken from the payload.
//
// Two ids could be the one a send recorded. `data.email_id` is documented as
// "the unique identifier for the specific email" and `data.message_id` as
// the RFC Message-ID header; the documentation does not say which of them
// equals the id the send API handed back, and guessing wrong means every
// webhook silently matches nothing.
//
// So neither is guessed. Both are offered and the lookup takes whichever
// exists, which is right under either answer and costs one short list.
export const messageIdsIn = (payload) => {
  const data = payload?.data ?? {};
  return [data.email_id, data.message_id].filter((value) => typeof value === "string" && value);
};

export const recipientIn = (payload) => {
  const to = payload?.data?.to;
  const first = Array.isArray(to) ? to[0] : to;
  return typeof first === "string" && first ? first.trim().toLowerCase() : null;
};

// Whether a bounce is the kind that never comes back.
//
// Only a permanent bounce suppresses an address, and the asymmetry is
// deliberate: failing to suppress costs a wasted send that bounces again,
// while suppressing wrongly silently stops somebody's mail for good and
// nothing in the product would ever show it. So the permanent case has to
// be stated outright, and everything else -- transient, undetermined, a
// value nobody has seen before -- is left alone.
//
// That matters more than usual here because the documentation disagrees
// with itself about the strings. The event page lists `Permanent` and
// `Temporary`; the bounce-types page lists `Permanent`, `Transient` and
// `Undetermined`. Both agree on `Permanent`, which is the only one this
// has to recognise, and the raw value is written down so the real set can
// be read off the log rather than off a page.
export const isPermanentBounce = (payload) =>
  String(payload?.data?.bounce?.type || "").trim().toLowerCase() === "permanent";

export const bounceTypeIn = (payload) =>
  String(payload?.data?.bounce?.type || "").trim() || "unstated";
