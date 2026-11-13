// May this person be sent this, right now.
//
// Decided here and nowhere else, from the database, for one recipient at a
// time. The caller says who it wants to reach; this says who it is allowed
// to reach. A caller that hands over a list of a thousand addresses still
// gets each one asked about, because a list assembled an hour ago is a list
// of who was eligible an hour ago.
//
// Suppression is asked first and separately, in email-classes.js: that is a
// fact about a mailbox. This is a question about a person's wishes.
import { sql } from "drizzle-orm";
import { db } from "./db/client.js";
import { emailPreferences, newsletterSubscribers, users } from "./db/schema.js";
import { MARKETING, PRODUCT_NOTIFICATION, SERVICE_ANNOUNCEMENT, TRANSACTIONAL } from "./email-classes.js";

// Which column holds the switch for each kind of product notification.
export const CATEGORIES = {
  battle_challenges: "notifyBattleChallenges",
  affiliate_earnings: "notifyAffiliateEarnings",
  comments: "notifyComments",
  character_activity: "notifyCharacterActivity",
};

export const isCategory = (value) => Object.hasOwn(CATEGORIES, value);

// What we know about this address: their preferences if they have an
// account, and their newsletter row if they ever typed it into the footer.
// Looked up by address rather than by id, because the caller does not always
// know whether the address belongs to anybody.
const whatWeKnow = async (email) => {
  const address = String(email || "").trim().toLowerCase();

  const [person] = await db
    .select({
      marketingStatus: emailPreferences.marketingStatus,
      pausedUntil: emailPreferences.pausedUntil,
      notifyBattleChallenges: emailPreferences.notifyBattleChallenges,
      notifyAffiliateEarnings: emailPreferences.notifyAffiliateEarnings,
      notifyComments: emailPreferences.notifyComments,
      notifyCharacterActivity: emailPreferences.notifyCharacterActivity,
    })
    .from(emailPreferences)
    .innerJoin(users, sql`${users.id} = ${emailPreferences.userId}`)
    .where(sql`lower(${users.email}) = ${address}`)
    .limit(1);

  if (person) return { kindOf: "account", ...person };

  const [listed] = await db
    .select({ status: newsletterSubscribers.status, pausedUntil: newsletterSubscribers.pausedUntil })
    .from(newsletterSubscribers)
    .where(sql`lower(${newsletterSubscribers.email}) = ${address}`)
    .limit(1);

  return listed
    ? { kindOf: "list", status: listed.status, pausedUntil: listed.pausedUntil }
    : { kindOf: "stranger" };
};

// Null when it may be sent; a sentence saying why not otherwise.
//
// The sentence is for the log and for whoever reads it later. It is never
// shown to the recipient, who by definition is not getting the email.
export async function whyNotEligible({ email, kind, category = null }) {
  // One person's own action caused it, and an announcement is about the
  // service itself. Neither is a thing to opt out of, so neither asks.
  if (kind === TRANSACTIONAL || kind === SERVICE_ANNOUNCEMENT) return null;

  const known = await whatWeKnow(email);

  if (kind === MARKETING) {
    if (known.kindOf === "account") {
      if (known.marketingStatus !== "subscribed") {
        // Said precisely, because "pending" and "unsubscribed" are very
        // different problems: one is a confirmation nobody clicked, the
        // other is somebody who said no.
        return `marketing is ${known.marketingStatus}, not subscribed`;
      }
      if (known.pausedUntil && known.pausedUntil > new Date()) {
        return `paused until ${known.pausedUntil.toISOString().slice(0, 10)}`;
      }
      return null;
    }

    if (known.kindOf === "list") {
      if (known.status !== "subscribed") return `the list says ${known.status}`;
      // A quiet month, asked for by somebody with no account. It was offered
      // to them, so it has to be obeyed for them: the page said "Paused for
      // 30 days" while every issue kept arriving.
      if (known.pausedUntil && known.pausedUntil > new Date()) {
        return `paused until ${known.pausedUntil.toISOString().slice(0, 10)}`;
      }
      return null;
    }

    // Nobody we have ever heard of. Not an error and not a send: an address
    // we hold no consent for is an address we do not write to.
    return "no consent on file for this address";
  }

  if (kind === PRODUCT_NOTIFICATION) {
    // These are about something that happened inside an account, so an
    // address with no account has nothing to be notified about.
    if (known.kindOf !== "account") return "no account, so nothing to notify about";

    if (!category) return "a product notification needs a category";
    if (!isCategory(category)) return `no such category: ${category}`;

    if (known.pausedUntil && known.pausedUntil > new Date()) {
      return `paused until ${known.pausedUntil.toISOString().slice(0, 10)}`;
    }

    return known[CATEGORIES[category]] ? null : `${category} notifications are switched off`;
  }

  return null;
}
