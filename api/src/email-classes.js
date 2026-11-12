// The four kinds of email, and who is allowed to receive each.
//
// Every send declares one. There is no fifth kind and no unclassified send:
// mailer.send() throws without one, so a new route, a script or a test cannot
// quietly introduce an email that nobody can account for afterwards.
//
// The property is `kind` rather than `class` because `class` is a reserved
// word in JavaScript and cannot be destructured without renaming it at every
// call site. The column in the database is `class`, as specified. The two
// meet in one place, in the mailer.

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

// Why a service announcement is being sent. A fixed list, because the line
// between "the terms changed" and "the terms changed, and look at our new
// feature" is the line between a lawful announcement and unsolicited
// marketing. Free text would put that line wherever the writer felt like it.
export const TERMS_CHANGE = "terms_change";
export const PRIVACY_CHANGE = "privacy_change";
export const SECURITY_NOTICE = "security_notice";
export const DOWNTIME = "downtime";
export const ACCOUNT_POLICY = "account_policy";

export const REASON_CATEGORIES = [
  TERMS_CHANGE,
  PRIVACY_CHANGE,
  SECURITY_NOTICE,
  DOWNTIME,
  ACCOUNT_POLICY,
];

export const isReasonCategory = (value) => REASON_CATEGORIES.includes(value);

// The three a person cannot opt out of hearing.
//
// Somebody who pressed "spam" has told us to stop, and almost everything
// should stop. These three are the exception: a change to the terms or the
// privacy policy is the document governing their account, and a security
// notice may be the only warning they get that something happened to it.
// Telling them is an obligation that an unsubscribe does not discharge.
//
// Downtime and account policy are not in this set. They matter, and they are
// not of that order: a maintenance window is not a change to the contract.
export const UNAVOIDABLE = [TERMS_CHANGE, PRIVACY_CHANGE, SECURITY_NOTICE];

export const isUnavoidable = (reasonCategory) => UNAVOIDABLE.includes(reasonCategory);

// Which sending identity a message goes out under.
//
// Two streams on two subdomains, so a complaint about the newsletter never
// slows a password reset. Anything a person can unsubscribe from goes on the
// marketing stream, because that is where complaints come from and the
// reputation cost should land there.
//
// The exception follows the one below it: an announcement nobody can opt out
// of has to arrive, so it goes out under the transactional identity.
export const streamFor = (kind, reasonCategory) => {
  if (kind === TRANSACTIONAL) return "transactional";
  if (kind === SERVICE_ANNOUNCEMENT && isUnavoidable(reasonCategory)) return "transactional";
  return "marketing";
};

// Why a suppressed address is or is not written to.
//
// A hard bounce is the address not existing. Sending again is shouting at a
// wall, and providers count it against the sending domain, which is how a
// password reset stops arriving for everybody else. So it blocks everything,
// including the announcements below: an address that does not exist cannot be
// told anything, and insisting only damages delivery for everybody else.
//
// A complaint is somebody pressing "spam". They still have an account, so
// transactional mail continues, and so do the three announcements nobody can
// opt out of: a change to the terms or the privacy policy, and a security
// notice. Everything else stops, including downtime and account policy.
//
// Manual is somebody put here by hand: a test address, or a person who wrote
// in asking to be left alone. Treated as a complaint, for the same reasons.
export const blockedBySuppression = (reason, kind, reasonCategory = null) => {
  if (!reason) return null;

  if (reason === "hard_bounce") {
    return "the address hard bounced, so nothing is sent to it";
  }

  if (kind === TRANSACTIONAL) return null;

  if (kind === SERVICE_ANNOUNCEMENT && isUnavoidable(reasonCategory)) return null;

  const because =
    reason === "complaint"
      ? "the address reported us as spam"
      : "the address is suppressed by hand";

  return kind === SERVICE_ANNOUNCEMENT
    ? `${because}, so only announcements nobody can opt out of are sent`
    : `${because}, so only transactional mail is sent`;
};
