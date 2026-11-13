// Choosing what you hear about, and the three ways of hearing less.
//
// The one that matters most is the token: somebody tapping a link in an
// email has no session, and if this screen asked them to sign in first the
// unsubscribe would become a spam complaint instead. So every path here is
// tested twice over -- once signed in, once holding nothing but the token
// that was in the footer of the letter.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";

const dataDir = ".pglite-preferences-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { emailPreferences, newsletterSubscribers, users } = await import("../src/db/schema.js");
const { whyNotEligible } = await import("../src/email-eligibility.js");
const { MARKETING, PRODUCT_NOTIFICATION } = await import("../src/email-classes.js");

let app;
let cookie = "";
let token = "";

const account = { email: "chooser@vantaorigin.test", username: "chooser", password: "supersecret1" };

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const read = (headers = {}, query = "") =>
  app.inject({ method: "GET", url: `/newsletter/preferences${query}`, headers });

const change = (payload, { headers = {}, query = "" } = {}) =>
  app.inject({ method: "PATCH", url: `/newsletter/preferences${query}`, headers, payload });

const rowOf = async () => {
  const [who] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(email) = ${account.email}`);
  const [row] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, who.id));
  return row ?? null;
};

const listRow = async () => {
  const [row] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(email) = ${account.email}`);
  return row ?? null;
};

// Back to a clean yes, so each test starts from somebody who is subscribed.
const subscribed = async () => {
  await change({ marketing: true }, { headers: { cookie } });
  for (const name of ["battle_challenges", "affiliate_earnings", "comments", "character_activity"]) {
    await change({ [name]: true }, { headers: { cookie } });
  }
};

before(async () => {
  await migrate();
  app = await buildApp();

  const signUp = await app.inject({ method: "POST", url: "/auth/signup", payload: account });
  cookie = cookieFrom(signUp);
  await db.update(users).set({ emailVerifiedAt: new Date() });

  // Signing up puts the address on the list, and the row carries the token
  // that goes in the footer of every letter.
  token = (await listRow())?.token ?? "";
  await subscribed();
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("the screen shows what this account has agreed to", async () => {
  await subscribed();
  const res = await read({ cookie });
  const body = res.json();

  assert.equal(res.statusCode, 200);
  assert.equal(body.email, account.email);
  assert.equal(body.hasAccount, true);
  assert.equal(body.marketing, true);
  assert.equal(body.categories.comments, true);
  assert.equal(body.pauseDays, 30);
});

test("the token in the footer opens it with nobody signed in", async () => {
  const res = await read({}, `?token=${encodeURIComponent(token)}`);
  const body = res.json();

  assert.equal(res.statusCode, 200);
  assert.equal(body.email, account.email);
  // The token belongs to a list row, but the address belongs to an account,
  // so they get the whole screen and not just the newsletter switch.
  assert.equal(body.hasAccount, true);
});

test("neither a session nor a token gets nothing, and says nothing", async () => {
  const nothing = await read();
  assert.equal(nothing.statusCode, 404);

  const madeUp = await read({}, "?token=not-a-real-token");
  assert.equal(madeUp.statusCode, 404);
  // The same answer either way: whether an address is on the list is not
  // ours to tell whoever asked.
  assert.deepEqual(madeUp.json(), nothing.json());
});

test("switching one category off leaves the others alone", async () => {
  await subscribed();
  const res = await change({ comments: false }, { headers: { cookie } });
  const body = res.json();

  assert.equal(res.statusCode, 200);
  assert.equal(body.categories.comments, false);
  assert.equal(body.categories.battle_challenges, true);

  // And the sender agrees, which is the only place it counts.
  assert.match(
    await whyNotEligible({ email: account.email, kind: PRODUCT_NOTIFICATION, category: "comments" }),
    /switched off/
  );
  assert.equal(
    await whyNotEligible({
      email: account.email,
      kind: PRODUCT_NOTIFICATION,
      category: "battle_challenges",
    }),
    null
  );
});

test("pause: quieter for a month, and it comes back on its own", async () => {
  await subscribed();
  const res = await change({ choose: "pause" }, { headers: { cookie } });
  const body = res.json();

  assert.equal(res.statusCode, 200);
  // Still subscribed. A pause is not a leaving, and treating it as one is
  // how somebody who wanted a quiet month ends up off the list for good.
  assert.equal(body.marketingStatus, "subscribed");

  const until = new Date(body.pausedUntil);
  const days = Math.round((until - Date.now()) / 86400000);
  assert.equal(days, 30);

  assert.match(await whyNotEligible({ email: account.email, kind: MARKETING }), /paused until/);
});

test("saying yes again clears the pause", async () => {
  await change({ choose: "pause" }, { headers: { cookie } });
  const res = await change({ marketing: true }, { headers: { cookie } });

  assert.equal(res.json().pausedUntil, null);
  assert.equal(await whyNotEligible({ email: account.email, kind: MARKETING }), null);
});

test("fewer: the letter keeps coming, the per-event mail stops", async () => {
  await subscribed();
  const res = await change({ choose: "fewer" }, { headers: { cookie } });
  const body = res.json();

  assert.equal(body.marketingStatus, "subscribed");
  assert.equal(await whyNotEligible({ email: account.email, kind: MARKETING }), null);

  for (const name of ["battle_challenges", "affiliate_earnings", "comments", "character_activity"]) {
    assert.equal(body.categories[name], false, `${name} should be off`);
    assert.match(
      await whyNotEligible({ email: account.email, kind: PRODUCT_NOTIFICATION, category: name }),
      /switched off/
    );
  }
});

test("leave: one press, a reason kept if offered, and the list agrees", async () => {
  await subscribed();
  const res = await change(
    { choose: "leave", reason: "too many emails" },
    { headers: { cookie } }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().marketingStatus, "unsubscribed");

  const row = await rowOf();
  assert.equal(row.unsubscribeReason, "too many emails");
  assert.ok(row.unsubscribedAt);

  // One fact, in two tables, kept in step. A row saying "subscribed" after
  // somebody left is how a send reaches them anyway.
  assert.equal((await listRow()).status, "unsubscribed");
  assert.match(await whyNotEligible({ email: account.email, kind: MARKETING }), /not subscribed/);
});

test("leaving works from the token alone", async () => {
  await subscribed();
  const res = await change({ choose: "leave" }, { query: `?token=${encodeURIComponent(token)}` });

  assert.equal(res.statusCode, 200);
  assert.equal((await listRow()).status, "unsubscribed");
  assert.match(await whyNotEligible({ email: account.email, kind: MARKETING }), /not subscribed/);
});

test("a reason longer than the field is refused, not truncated", async () => {
  const res = await change(
    { choose: "leave", reason: "x".repeat(400) },
    { headers: { cookie } }
  );
  assert.equal(res.statusCode, 400);
});

test("somebody on the list with no account is shown the list and nothing else", async () => {
  await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "passerby@vantaorigin.test" },
  });
  const [listed] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(email) = 'passerby@vantaorigin.test'`);
  await db
    .update(newsletterSubscribers)
    .set({ status: "subscribed" })
    .where(eq(newsletterSubscribers.id, listed.id));

  const query = `?token=${encodeURIComponent(listed.token)}`;

  const shown = await read({}, query);
  assert.equal(shown.statusCode, 200);
  assert.equal(shown.json().hasAccount, false);
  // No account, so no per-event mail to have opinions about.
  assert.equal(shown.json().categories, null);

  const left = await change({ choose: "leave" }, { query });
  assert.equal(left.statusCode, 200);
  assert.equal(left.json().marketingStatus, "unsubscribed");

  const [after] = await db
    .select({ status: newsletterSubscribers.status })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, listed.id));
  assert.equal(after.status, "unsubscribed");

  // And the page is told the truth about it afterwards, rather than being
  // left to draw the switch from nothing.
  const reopened = await read({}, query);
  assert.equal(reopened.json().marketing, false);
  assert.equal(reopened.json().marketingStatus, "unsubscribed");
});

// Coming back is consenting, and the record has to say so.
//
// A row that says "subscribed" and still carries the date they left, or the
// reason they gave, is one fact recorded twice in two different states. The
// send does not read those fields, so nothing visibly breaks -- which is
// exactly why it would have sat there until somebody was asked to prove how
// we got permission and found an unsubscribe date on a live subscriber.
test("saying yes again records fresh consent and clears the leaving", async () => {
  await subscribed();
  await change({ choose: "leave", reason: "too many emails" }, { headers: { cookie } });

  const left = await rowOf();
  assert.ok(left.unsubscribedAt);
  assert.equal(left.unsubscribeReason, "too many emails");

  await change({ marketing: true }, { headers: { cookie } });
  const back = await rowOf();

  assert.equal(back.marketingStatus, "subscribed");
  assert.equal(back.unsubscribedAt, null);
  assert.equal(back.unsubscribeReason, null);
  // The consent is new, dated, and attributed to this screen.
  assert.ok(back.consentAt);
  assert.equal(back.consentSource, "preferences_page");
  // Nothing inherited left to look into: they have just said it themselves.
  assert.equal(back.needsConsentReview, false);

  // And the two tables agree, which is the part a send depends on.
  assert.equal((await listRow()).status, "subscribed");
  assert.equal((await listRow()).unsubscribedAt, null);
});

// A test copy's footer carries a token that belongs to nobody.
//
// The unsubscribe route already says so rather than claiming the link
// expired; the preferences link in the same footer has to say the same
// thing, or the one email whose job is proving the letter works ends in a
// screen saying we cannot match the link.
test("the token in a test copy is named as one, not called unmatched", async () => {
  const { TEST_TOKEN } = await import("../src/newsletter.js");
  const res = await read({}, `?token=${encodeURIComponent(TEST_TOKEN)}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().testCopy, true);
  // And nothing about a real person comes back with it.
  assert.equal(res.json().email, undefined);
});

test("a test copy's token cannot change anybody's settings", async () => {
  const { TEST_TOKEN } = await import("../src/newsletter.js");
  await subscribed();

  const res = await change(
    { choose: "leave" },
    { query: `?token=${encodeURIComponent(TEST_TOKEN)}` }
  );

  assert.equal(res.json().testCopy, true);
  // Everybody is exactly where they were.
  assert.equal((await rowOf()).marketingStatus, "subscribed");
  assert.equal((await listRow()).status, "subscribed");
});

// Somebody with no account who left, and changed their mind.
//
// The page drew a switch for them and the API quietly ignored the press, so
// it said "You are on the list" to somebody it had just left off it. The
// token is a secret only that address has, which is the same standard the
// confirmation link is held to, so tapping it counts.
test("a listed address with no account can come back", async () => {
  await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "returner@vantaorigin.test" },
  });
  const [listed] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(email) = 'returner@vantaorigin.test'`);
  await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.id, listed.id));

  const query = `?token=${encodeURIComponent(listed.token)}`;

  // Shown as off, truthfully.
  assert.equal((await read({}, query)).json().marketing, false);

  const back = await change({ marketing: true }, { query });
  assert.equal(back.json().marketing, true);

  const [after] = await db
    .select({ status: newsletterSubscribers.status, unsubscribedAt: newsletterSubscribers.unsubscribedAt })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, listed.id));
  assert.equal(after.status, "subscribed");
  assert.equal(after.unsubscribedAt, null);

  // And the sender agrees, which is the only place it counts.
  assert.equal(await whyNotEligible({ email: "returner@vantaorigin.test", kind: MARKETING }), null);
});

// ---------------------------------------------------------------------------
// The four the checker found. Each of these failed before the fix beside it.
// ---------------------------------------------------------------------------

// A session must not quietly stand in for the address in the link.
//
// Somebody signed in as one address opens the link from a letter sent to
// another -- a shared computer, a second account, a forwarded mail. Reading
// the session acted on whoever was signed in: their settings changed, the
// address named in the link stayed on the list, and the page said nothing
// about either.
test("the token in the link decides, not whoever happens to be signed in", async () => {
  await subscribed();

  await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "someone-else@vantaorigin.test" },
  });
  const [other] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(email) = 'someone-else@vantaorigin.test'`);
  await db
    .update(newsletterSubscribers)
    .set({ status: "subscribed" })
    .where(eq(newsletterSubscribers.id, other.id));

  const query = `?token=${encodeURIComponent(other.token)}`;

  // Read with a session that belongs to somebody else entirely.
  const shown = await read({ cookie }, query);
  assert.equal(shown.json().email, "someone-else@vantaorigin.test");

  const left = await change({ choose: "leave" }, { headers: { cookie }, query });
  assert.equal(left.json().email, "someone-else@vantaorigin.test");

  // The address in the link came off.
  const [after] = await db
    .select({ status: newsletterSubscribers.status })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, other.id));
  assert.equal(after.status, "unsubscribed");

  // And the signed-in account was not touched.
  assert.equal((await rowOf()).marketingStatus, "subscribed");
});

test("a token that matches nothing is refused, rather than falling back to the session", async () => {
  await subscribed();

  const res = await change(
    { choose: "leave" },
    { headers: { cookie }, query: "?token=not-a-real-token" }
  );

  assert.equal(res.statusCode, 404);
  // Acting on an account nobody named is the whole bug.
  assert.equal((await rowOf()).marketingStatus, "subscribed");
});

// An account with no preferences row yet -- which was every account made
// through Google, because that route created a user and no row.
const googleShaped = async (address) => {
  const [person] = await db
    .insert(users)
    .values({ email: address, username: address.split("@")[0], passwordHash: "x".repeat(60) })
    .returning({ id: users.id });

  await app.inject({ method: "POST", url: "/newsletter/subscribe", payload: { email: address } });
  await db
    .update(newsletterSubscribers)
    .set({ status: "subscribed" })
    .where(sql`lower(${newsletterSubscribers.email}) = ${address}`);

  const [listed] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(${newsletterSubscribers.email}) = ${address}`);

  // No email_preferences row at all: that is the state under test.
  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, person.id));
  assert.equal(rows.length, 0, "starts with no preferences row");

  return { userId: person.id, token: listed.token };
};

// Pausing used to create the row by insert, where marketing_status fell to
// the column default of "pending" -- and pending is refused forever, so the
// pause never lapsed. The date was never what was refusing it.
test("a pause by an account with no row yet still ends when it says it will", async () => {
  const address = "paused-google@vantaorigin.test";
  const who = await googleShaped(address);
  const query = `?token=${encodeURIComponent(who.token)}`;

  assert.equal(await whyNotEligible({ email: address, kind: MARKETING }), null);

  const res = await change({ choose: "pause" }, { query });
  assert.equal(res.statusCode, 200);
  // Still subscribed. A pause is not a leaving and must not become one.
  assert.equal(res.json().marketingStatus, "subscribed");

  assert.match(await whyNotEligible({ email: address, kind: MARKETING }), /paused until/);

  // Wind it into the past: the month is over.
  const lastWeek = new Date(Date.now() - 7 * 86400000);
  await db
    .update(emailPreferences)
    .set({ pausedUntil: lastWeek })
    .where(eq(emailPreferences.userId, who.userId));
  await db
    .update(newsletterSubscribers)
    .set({ pausedUntil: lastWeek })
    .where(sql`lower(${newsletterSubscribers.email}) = ${address}`);

  assert.equal(
    await whyNotEligible({ email: address, kind: MARKETING }),
    null,
    "the pause lapses on its own"
  );
});

// "Just the newsletter, nothing else" switched off the newsletter: the same
// insert, the same default, the one thing the button promises to keep.
test("hearing less keeps the newsletter for an account with no row yet", async () => {
  const address = "fewer-google@vantaorigin.test";
  const who = await googleShaped(address);
  const query = `?token=${encodeURIComponent(who.token)}`;

  const res = await change({ choose: "fewer" }, { query });

  assert.equal(res.json().marketingStatus, "subscribed");
  assert.equal(res.json().marketing, true);
  assert.equal(
    await whyNotEligible({ email: address, kind: MARKETING }),
    null,
    "the letter still comes"
  );
  for (const name of Object.keys(res.json().categories)) {
    assert.equal(res.json().categories[name], false, `${name} should be off`);
  }
});

// One-click unsubscribe wrote to the list alone, so the two records
// disagreed, and whyNotEligible -- which reads the account row first and
// never looks at the list -- answered "yes" about somebody who had just
// pressed unsubscribe.
test("one-click unsubscribe stops the sender, not just the list", async () => {
  await subscribed();
  assert.equal(await whyNotEligible({ email: account.email, kind: MARKETING }), null);

  const res = await app.inject({
    method: "GET",
    url: `/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
  });
  assert.equal(res.statusCode, 200);

  assert.equal((await listRow()).status, "unsubscribed");
  assert.equal((await rowOf()).marketingStatus, "unsubscribed");
  assert.match(
    await whyNotEligible({ email: account.email, kind: MARKETING }),
    /not subscribed/,
    "the one place that decides agrees"
  );
});

// Pause was offered to a list-only reader, wrote nothing at all, and the
// page said "Paused for 30 days" while every issue kept arriving. That is
// most of the people who ever see this screen.
test("a pause by somebody with no account is real", async () => {
  const address = "quietmonth@vantaorigin.test";
  await app.inject({ method: "POST", url: "/newsletter/subscribe", payload: { email: address } });
  await db
    .update(newsletterSubscribers)
    .set({ status: "subscribed" })
    .where(sql`lower(${newsletterSubscribers.email}) = ${address}`);
  const [listed] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(${newsletterSubscribers.email}) = ${address}`);

  const query = `?token=${encodeURIComponent(listed.token)}`;
  const res = await change({ choose: "pause" }, { query });

  assert.equal(res.statusCode, 200);
  // Said back from what was written, so a press that saved nothing cannot
  // report success.
  assert.ok(res.json().pausedUntil, "the page is told the date");
  const days = Math.round((new Date(res.json().pausedUntil) - Date.now()) / 86400000);
  assert.equal(days, 30);

  assert.match(await whyNotEligible({ email: address, kind: MARKETING }), /paused until/);

  // And it is still a pause, not a leaving.
  const [after] = await db
    .select({ status: newsletterSubscribers.status })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, listed.id));
  assert.equal(after.status, "subscribed");
});
