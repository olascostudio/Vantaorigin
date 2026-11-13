// What somebody wants to hear about, and the ways of hearing less.
//
// Reachable two ways: signed in, or with the token from an email. The token
// matters because the person who most wants this screen is the one holding
// an email and no patience, and asking them to remember a password first is
// how an unsubscribe becomes a spam complaint instead.
//
// The three ways out are the point. "Unsubscribe" as the only option means
// somebody who wanted one fewer email a month leaves entirely, and every
// one of those is a reader lost to a setting that did not exist. None of
// them is a screen that argues.
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { emailPreferences, newsletterSubscribers, users } from "../db/schema.js";
import { authenticate } from "../auth/auth.js";
import { TEST_TOKEN } from "../newsletter.js";
import { CATEGORIES } from "../email-eligibility.js";

const PAUSE_DAYS = 30;

const body = z.object({
  marketing: z.boolean().optional(),
  // One of the three ways out, taken in a single press.
  choose: z.enum(["pause", "fewer", "leave"]).optional(),
  reason: z.string().max(300).optional(),
  ...Object.fromEntries(Object.keys(CATEGORIES).map((name) => [name, z.boolean().optional()])),
});

// The list row behind an address, whichever way we arrived at it.
const listedBy = (where) =>
  db
    .select({
      email: newsletterSubscribers.email,
      status: newsletterSubscribers.status,
      pausedUntil: newsletterSubscribers.pausedUntil,
    })
    .from(newsletterSubscribers)
    .where(where)
    .limit(1);

// Whose settings these are.
//
// The token wins over the session, and that ordering is the fix for a real
// mix-up rather than a preference. Somebody signed in as one address who
// opens the link from a letter sent to another -- a shared computer, a
// second account, a forwarded mail -- pressed a link that names an address.
// Reading the session instead acted on whoever happened to be signed in:
// their settings changed, the address named in the link stayed exactly as
// it was, and nothing on the page said so in either direction.
//
// A token that matches nothing returns nothing, rather than quietly falling
// back to the session. Acting on an account nobody named is the whole bug.
//
// "A test copy" is answered before any lookup. The footer of a test letter
// carries the shared test token, and a writer checking their own test copy
// who taps it would otherwise be told we cannot match the link -- which
// reads like a broken link on the one email whose job is proving the letter
// is not broken.
const whoIsAsking = async (request) => {
  const token = String(request.query.token || "").trim();

  if (token) {
    if (token === TEST_TOKEN) return { testCopy: true };

    const [listed] = await listedBy(eq(newsletterSubscribers.token, token));
    if (!listed) return null;

    const [person] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${listed.email.toLowerCase()}`)
      .limit(1);

    return {
      userId: person?.id ?? null,
      email: listed.email,
      listStatus: listed.status,
      listPausedUntil: listed.pausedUntil,
      token,
    };
  }

  if (!request.user) return null;

  // Signed in with no token. Their list row comes along too, because an
  // account can also be on the list and the two have to be kept in step.
  const [listed] = await listedBy(sql`lower(${newsletterSubscribers.email}) = ${request.user.email.toLowerCase()}`);
  return {
    userId: request.user.id,
    email: request.user.email,
    listStatus: listed?.status ?? null,
    listPausedUntil: listed?.pausedUntil ?? null,
  };
};

// What a preferences row should hold for an account that has never had one.
//
// Seeded from the list rather than from the column defaults, and it is the
// same rule 0024_migrate_newsletter_consent.sql applies, for the same
// reason: somebody already on the newsletter is subscribed, and the consent
// behind that is inherited and cannot be evidenced, so it is flagged.
//
// The column default is "pending", and letting an insert fall to it was a
// bad bug. An account with no row -- every account made through Google,
// which creates a user without one -- pressed Pause or "just the
// newsletter", the insert took the default, and marketing was refused for
// good: the pause never lapsed because the status, not the date, was what
// refused it, and "just the newsletter, nothing else" switched off the
// newsletter, the one thing it promises to keep.
const seedFor = (who) => ({
  marketingStatus:
    who.listStatus === "subscribed"
      ? "subscribed"
      : who.listStatus === "unsubscribed"
        ? "unsubscribed"
        : "pending",
  consentSource: who.listStatus ? "legacy_import" : null,
  needsConsentReview: who.listStatus === "subscribed",
});

const rowFor = async (who) => {
  if (!who.userId) return null;
  const [row] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, who.userId))
    .limit(1);
  if (row) return row;

  // Shown as it would be saved, so the screen and the next write agree.
  return {
    ...seedFor(who),
    pausedUntil: null,
    ...Object.fromEntries(Object.values(CATEGORIES).map((column) => [column, true])),
  };
};

// What the screen shows. A reader with no account has the newsletter and
// nothing else, because the rest are about things happening in an account.
const asAnswer = (who, row) => ({
  email: who.email,
  hasAccount: Boolean(who.userId),
  // With an account the preferences row is the answer; without one the old
  // list row is all there is, and it is still an answer. Reporting null for
  // somebody who is plainly on the list made the page draw the switch as
  // off, and then say "You are on the list" after a press the API ignored.
  marketing: row ? row.marketingStatus === "subscribed" : who.listStatus === "subscribed",
  marketingStatus: row ? row.marketingStatus : (who.listStatus ?? null),
  // One source or the other, never a `??` chain across both. With an
  // account the row is the answer even when the answer is null, and a
  // chain made "no pause" fall through to the list's old date -- so
  // clearing a pause reported the pause it had just cleared.
  pausedUntil: row ? (row.pausedUntil ?? null) : (who.listPausedUntil ?? null),
  categories: row
    ? Object.fromEntries(Object.keys(CATEGORIES).map((name) => [name, row[CATEGORIES[name]]]))
    : null,
  pauseDays: PAUSE_DAYS,
});

export default async function preferenceRoutes(app) {
  app.get(
    "/newsletter/preferences",
    { preHandler: authenticate({ required: false }) },
    async (request, reply) => {
      const who = await whoIsAsking(request);
      if (!who) return reply.code(404).send({ error: "We could not find that" });
      if (who.testCopy) return { testCopy: true };
      return asAnswer(who, await rowFor(who));
    }
  );

  app.patch(
    "/newsletter/preferences",
    { preHandler: authenticate({ required: false }) },
    async (request, reply) => {
      const who = await whoIsAsking(request);
      if (!who) return reply.code(404).send({ error: "We could not find that" });
      if (who.testCopy) return { testCopy: true };

      const parsed = body.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: "Check the fields and try again" });
      const wanted = parsed.data;

      // Somebody with no account is on the list and nothing else. There are
      // no per-event categories to thin out, so "fewer" is not offered to
      // them -- but leaving, coming back and pausing all are, and pausing
      // used to write nothing at all while the page said "Paused for 30
      // days" and every issue kept arriving.
      if (!who.userId) {
        const leaving = wanted.marketing === false || wanted.choose === "leave";
        // Coming back counts. The token is a secret only the owner of that
        // address has, so tapping it is an act by that person, which is the
        // same standard the confirmation link is held to.
        const returning = wanted.marketing === true;
        const pausing = wanted.choose === "pause";

        const change = { updatedAt: new Date() };
        if (leaving) {
          change.status = "unsubscribed";
          change.unsubscribedAt = new Date();
        }
        if (returning) {
          change.status = "subscribed";
          change.unsubscribedAt = null;
          change.pausedUntil = null;
        }
        if (pausing) change.pausedUntil = new Date(Date.now() + PAUSE_DAYS * 86400000);

        if (leaving || returning || pausing) {
          await db
            .update(newsletterSubscribers)
            .set(change)
            .where(sql`lower(${newsletterSubscribers.email}) = ${who.email.toLowerCase()}`);
        }

        // Read back rather than guessed at, so the page is told what was
        // actually written and a press that saved nothing cannot report
        // success.
        const [now] = await listedBy(
          sql`lower(${newsletterSubscribers.email}) = ${who.email.toLowerCase()}`
        );
        return asAnswer(
          { ...who, listStatus: now?.status ?? who.listStatus, listPausedUntil: now?.pausedUntil ?? null },
          null
        );
      }

      const patch = { updatedAt: new Date() };

      if (wanted.marketing !== undefined) {
        patch.marketingStatus = wanted.marketing ? "subscribed" : "unsubscribed";
        if (!wanted.marketing) patch.unsubscribedAt = new Date();
        if (wanted.marketing) {
          // Coming back clears the pause: they have just said yes, which is a
          // louder statement than a pause they set a fortnight ago.
          patch.pausedUntil = null;
          // And it clears the date they left, which is now untrue. The other
          // table already cleared it, and one fact recorded two ways that
          // disagree is worse than not recording it.
          patch.unsubscribedAt = null;
          patch.unsubscribeReason = null;
          // Somebody pressing this is consenting, here, now. Written down,
          // because "they consented" is not an answer to "show me".
          patch.consentAt = new Date();
          patch.consentSource = "preferences_page";
          patch.consentIp = request.ip ?? null;
          // Said by hand, so there is nothing inherited left to review.
          patch.needsConsentReview = false;
        }
      }

      for (const [name, column] of Object.entries(CATEGORIES)) {
        if (wanted[name] !== undefined) patch[column] = wanted[name];
      }

      if (wanted.choose === "pause") {
        // Quieter than leaving, and it comes back on its own. Nobody has to
        // remember to return.
        patch.pausedUntil = new Date(Date.now() + PAUSE_DAYS * 86400000);
      }
      if (wanted.choose === "fewer") {
        // The newsletter stays; the per-event mail stops. That is almost
        // always what "too many emails" actually means.
        for (const column of Object.values(CATEGORIES)) patch[column] = false;
      }
      if (wanted.choose === "leave") {
        patch.marketingStatus = "unsubscribed";
        patch.unsubscribedAt = new Date();
        if (wanted.reason) patch.unsubscribeReason = wanted.reason;
      }

      // The seed only reaches the insert leg: an existing row keeps every
      // field this patch does not name. Without it a first save of
      // anything -- a pause, a category -- created a row whose
      // marketing_status fell to the column default and refused the
      // newsletter from then on.
      await db
        .insert(emailPreferences)
        .values({ userId: who.userId, ...seedFor(who), ...patch })
        .onConflictDoUpdate({ target: emailPreferences.userId, set: patch });

      // Whether they are on the list is one fact, so the old table is kept
      // in step rather than left to disagree. The pause travels with it, so
      // the same address paused through an account reads as paused on the
      // list too.
      const alsoOnTheList = { updatedAt: new Date() };
      if (patch.marketingStatus) {
        alsoOnTheList.status =
          patch.marketingStatus === "subscribed" ? "subscribed" : "unsubscribed";
        alsoOnTheList.unsubscribedAt =
          patch.marketingStatus === "subscribed" ? null : new Date();
      }
      if (patch.pausedUntil !== undefined) alsoOnTheList.pausedUntil = patch.pausedUntil;

      if (Object.keys(alsoOnTheList).length > 1) {
        await db
          .update(newsletterSubscribers)
          .set(alsoOnTheList)
          .where(sql`lower(${newsletterSubscribers.email}) = ${who.email.toLowerCase()}`);
      }

      return asAnswer(who, await rowFor(who));
    }
  );
}
