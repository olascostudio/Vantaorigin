// Keeping the list.
//
// Two ways on: the form in the footer, and making an account, and every account
// hears from us unless they say otherwise. One way off, and it has to work
// from an email client with nobody signed in, which is what the token is for.
//
// Offering an address that is already on the list is not an error and never
// says so: whether an address is on it is not ours to tell whoever asked.
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "./db/client.js";
import { emailPreferences, newsletterSubscribers, users } from "./db/schema.js";

const newToken = () => randomBytes(24).toString("base64url");

export const tidyEmail = (email) => String(email || "").trim().toLowerCase();

const byEmail = async (email) => {
  const [row] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(${newsletterSubscribers.email}) = ${tidyEmail(email)}`)
    .limit(1);
  return row ?? null;
};

// Adds an address, or brings back one that had left. Returns what happened,
// for the caller's own use, never for telling the person who asked.
export async function subscribe(email, source = "footer") {
  const address = tidyEmail(email);
  if (!address || !address.includes("@")) return { ok: false, reason: "not an address" };

  const existing = await byEmail(address);

  if (!existing) {
    try {
      const [row] = await db
        .insert(newsletterSubscribers)
        .values({ email: address, source, token: newToken() })
        .returning();
      return { ok: true, state: "added", subscriber: row };
    } catch (error) {
      // The same address offered twice in the same moment -- two tabs, or a
      // phone and a laptop. One insert wins and the unique index turns the
      // other away; that is the index doing its job, not a failure worth
      // showing to somebody who is, after all, now on the list.
      const clash = error?.cause?.code === "23505" || error?.code === "23505";
      if (!clash) throw error;

      const row = await byEmail(address);
      if (row) return { ok: true, state: "already", subscriber: row };
      throw error;
    }
  }

  // Somebody who left and came back is welcome back.
  if (existing.status !== "subscribed") {
    const [row] = await db
      .update(newsletterSubscribers)
      .set({ status: "subscribed", unsubscribedAt: null, updatedAt: new Date() })
      .where(eq(newsletterSubscribers.id, existing.id))
      .returning();
    return { ok: true, state: "returned", subscriber: row };
  }

  return { ok: true, state: "already", subscriber: existing };
}

// Never lets a failure here break the thing that triggered it: somebody
// making an account must not be turned away because a list write failed.
export async function subscribeQuietly(app, email, source) {
  try {
    return await subscribe(email, source);
  } catch (error) {
    app?.log?.warn({ err: error }, "could not add to the newsletter");
    return { ok: false };
  }
}

// Leaving. The mirror of confirmByToken, and it has to write to both tables
// for the same reason that one does.
//
// It used to touch the list alone. For an address with an account that left
// the two records then disagreed -- the list said unsubscribed, the
// preferences row still said subscribed -- and whyNotEligible() reads the
// preferences row first and never looks at the list, so the one place that
// decides whether to send answered "yes" about somebody who had just
// pressed unsubscribe. The newsletter send missed them anyway, because it
// picks its recipients from the list; anything addressing a person by email
// reached them, the Google welcome among them.
export async function unsubscribeByToken(token) {
  if (!token) return null;

  const left = { status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() };

  const [row] = await db
    .update(newsletterSubscribers)
    .set(left)
    .where(eq(newsletterSubscribers.token, String(token)))
    .returning();
  if (!row) return null;

  const [person] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${row.email.toLowerCase()}`)
    .limit(1);

  if (person) {
    const withdrawn = {
      marketingStatus: "unsubscribed",
      unsubscribedAt: left.unsubscribedAt,
      // Said by hand, which is the clearest consent record there is: there
      // is nothing inherited left for anybody to look into.
      needsConsentReview: false,
      updatedAt: new Date(),
    };
    await db
      .insert(emailPreferences)
      .values({ userId: person.id, ...withdrawn })
      .onConflictDoUpdate({ target: emailPreferences.userId, set: withdrawn });
  }

  return row;
}

// The token a test copy carries.
//
// A test goes to one address so the letter can be read in a real inbox
// before anyone else gets it, and it must not be able to take a real person
// off the list. So it carries a token that belongs to nobody. Clicking it
// used to land on "that link has expired", which reads like a broken send
// on the one email whose whole purpose is checking the send is not broken.
export const TEST_TOKEN = "test-copy-not-a-real-subscription";

// Every address in whatever was pasted or uploaded.
//
// A list arrives in a different shape every time: a column copied out of a
// spreadsheet, a CSV exported from somewhere else with the address in the
// fourth column, a line of addresses separated by commas, a mailbox export
// with names and quotes around everything. Rather than teach this about each
// shape, every address in the text is picked out and the rest is thrown away.
// That reads all of them, and a header row costs nothing because "Email
// Address" is not an address.
//
// Lowercased and deduplicated, because the same person twice in a file is
// one person.
export const addressesIn = (text) => {
  const found = String(text || "").match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  return [...new Set(found.map((address) => address.toLowerCase()))];
};

export const unsubscribeLink = (site, token) =>
  `${String(site).replace(/\/$/, "")}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

// Where somebody chooses what they hear about. On the site rather than the
// API, because it is a screen and not an action, and it carries the same
// token so it opens from an inbox with nobody signed in.
export const preferencesLink = (site, token) =>
  `${String(site).replace(/\/$/, "")}/newsletter/preferences?token=${encodeURIComponent(token)}`;

// The link in the confirmation email. Same token the unsubscribe link
// carries: it is already a secret only that person has, and minting a second
// one would mean two things to keep, two things to leak and two things to
// get wrong.
export const confirmLink = (site, token) =>
  `${String(site).replace(/\/$/, "")}/newsletter/confirm?token=${encodeURIComponent(token)}`;

// Saying yes. This is the moment consent exists: before it, somebody typed
// an address into a form, which is not the same thing because the address
// might not have been theirs.
//
// Records how, when and from where, because "they consented" is not an
// answer to "show me". Idempotent, since a link in an inbox gets tapped
// twice and prefetched by mail clients that open it before anyone reads it.
export async function confirmByToken(token, { ip = null } = {}) {
  if (!token) return null;

  const [row] = await db
    .update(newsletterSubscribers)
    .set({ status: "subscribed", unsubscribedAt: null, updatedAt: new Date() })
    .where(eq(newsletterSubscribers.token, String(token)))
    .returning();
  if (!row) return null;

  // And if the address belongs to an account, that is where the consent
  // record lives.
  const [person] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${row.email.toLowerCase()}`)
    .limit(1);

  if (person) {
    const consent = {
      marketingStatus: "subscribed",
      consentAt: new Date(),
      consentSource: "double_opt_in",
      consentIp: ip,
      unsubscribedAt: null,
      unsubscribeReason: null,
      // Confirmed by hand, so there is nothing left for anybody to review.
      needsConsentReview: false,
      updatedAt: new Date(),
    };
    await db
      .insert(emailPreferences)
      .values({ userId: person.id, ...consent })
      .onConflictDoUpdate({ target: emailPreferences.userId, set: consent });
  }

  return { subscriber: row, userId: person?.id ?? null };
}
