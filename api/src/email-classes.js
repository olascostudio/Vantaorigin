// The four kinds of email, and who is allowed to receive each.
//
// Every send declares one. There is no fifth kind and no unclassified send:
// mailer.send() throws without one, so a new route, a script or a test cannot
// quietly introduce an email that nobody can account for afterwards.
//
// The property is `kind` rather than `class` because `class` is a reserved
// word in JavaScript and cannot be destructured without renaming it at every
// call site. The column in the database is `class`, as specified. The two
// meet in one place, in logSend() below.

export const TRANSACTIONAL = "transactional";
export const SERVICE_ANNOUNCEMENT = "service_announcement";
export const PRODUCT_NOTIFICATION = "product_notification";
export const MARKETING = "marketing";

export const KINDS = [TRANSACTIONAL, SERVICE_ANNOUNCEMENT, PRODUCT_NOTIFICATION, MARKETING];

// What each one is for, in one line, for the admin screens that have to
// explain themselves to whoever is about to press send.
export const DESCRIBES = {
  [TRANSACTIONAL]: "One person's own action caused it. Always sent, and never unsubscribable.",
  [SERVICE_ANNOUNCEMENT]: "The service itself changed. Goes to every active account.",
  [PRODUCT_NOTIFICATION]: "Something happened in your account. On by default, off per category.",
  [MARKETING]: "The newsletter and anything like it. Only to people who asked for it.",
};

export const isKind = (value) => KINDS.includes(value);

// Why a suppressed address is or is not written to.
//
// A hard bounce is the address not existing. Sending again is shouting at a
// wall, and providers count it against the sending domain, which is how a
// password reset stops arriving for everybody else. So it blocks everything.
//
// A complaint is somebody pressing "spam". They still have an account and may
// still need a password reset, so it blocks the mail they did not ask for and
// leaves the mail they need.
//
// Manual is somebody put here by hand: a test address, or a person who wrote
// in asking to be left alone. Same shape as a complaint.
export const blockedBySuppression = (reason, kind) => {
  if (!reason) return null;
  if (reason === "hard_bounce") {
    return "the address hard bounced, so nothing is sent to it";
  }
  if (kind === TRANSACTIONAL) return null;
  return reason === "complaint"
    ? "the address reported us as spam, so only transactional mail is sent"
    : "the address is suppressed by hand, so only transactional mail is sent";
};
