// Subscribing to a creator.
//
// This hands one person's address to another person, which is the one thing
// here that cannot be taken back. So the tests care most about who may do
// it, what gets written down when they do, and that leaving works from an
// inbox with nobody signed in.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { and, eq, sql } from "drizzle-orm";

const dataDir = ".pglite-creator-subs-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { creatorSubscriptions, users } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");

let app;
let sent = [];
const realSend = mailer.send;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

// Two creators and a reader, so "only your own" can actually be tested.
const people = {
  artist: { email: "artist@vantaorigin.test", username: "artist", password: "supersecret1" },
  rival: { email: "rival@vantaorigin.test", username: "rival", password: "supersecret1" },
  reader: { email: "reader@vantaorigin.test", username: "reader", password: "supersecret1" },
};
const cookies = {};

const signUp = async (who) => {
  const res = await app.inject({ method: "POST", url: "/auth/signup", payload: people[who] });
  cookies[who] = cookieFrom(res);
};

const ask = (username, cookie) =>
  app.inject({
    method: "GET",
    url: `/public/creators/${username}/subscription`,
    headers: cookie ? { cookie } : {},
  });

const subscribe = (username, cookie, payload = {}) =>
  app.inject({
    method: "POST",
    url: `/public/creators/${username}/subscribe`,
    headers: { cookie },
    payload,
  });

const unsubscribe = (username, cookie) =>
  app.inject({
    method: "DELETE",
    url: `/public/creators/${username}/subscribe`,
    headers: { cookie },
  });

const rowFor = async (creator, subscriber) => {
  const [c] = await db.select({ id: users.id }).from(users).where(sql`lower(email) = ${people[creator].email}`);
  const [s] = await db.select({ id: users.id }).from(users).where(sql`lower(email) = ${people[subscriber].email}`);
  const [row] = await db
    .select()
    .from(creatorSubscriptions)
    .where(
      and(eq(creatorSubscriptions.creatorId, c.id), eq(creatorSubscriptions.subscriberId, s.id))
    );
  return row ?? null;
};

before(async () => {
  await migrate();
  app = await buildApp();

  for (const who of Object.keys(people)) await signUp(who);
  // Confirmed outright; the journey itself is covered in verification.test.js.
  await db.update(users).set({ emailVerifiedAt: new Date() });

  mailer.send = async (message) => {
    sent.push(message);
    return { id: `test-${sent.length}` };
  };
});

after(async () => {
  mailer.send = realSend;
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(creatorSubscriptions);
  sent = [];
});

test("a signed in reader subscribes, and the consent is written down", async () => {
  const res = await subscribe("artist", cookies.reader);

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().subscribed, true);
  assert.equal(res.json().creatorName, "artist");

  const row = await rowFor("artist", "reader");
  assert.equal(row.status, "subscribed");
  // The evidence. This is the only answer to "show me that they agreed to
  // their address going to this creator".
  assert.ok(row.consentAt);
  assert.ok(row.token);
});

test("the page is told whether to draw the button, and never for your own", async () => {
  const stranger = (await ask("artist")).json();
  assert.equal(stranger.subscribed, false);
  assert.equal(stranger.own, false);

  const owner = (await ask("artist", cookies.artist)).json();
  // Said by the API as well as the page, so it does not depend on the
  // browser getting it right.
  assert.equal(owner.own, true);

  await subscribe("artist", cookies.reader);
  assert.equal((await ask("artist", cookies.reader)).json().subscribed, true);
});

test("you cannot subscribe to yourself", async () => {
  const res = await subscribe("artist", cookies.artist);

  assert.equal(res.statusCode, 400);
  assert.equal(await rowFor("artist", "artist"), null);
});

test("subscribing twice leaves one row and does not send a second email", async () => {
  await subscribe("artist", cookies.reader);
  assert.equal(sent.length, 1);

  await subscribe("artist", cookies.reader);

  const rows = await db.select().from(creatorSubscriptions);
  assert.equal(rows.length, 1, "one row per pair");
  // Pressing a button twice is not two decisions, and must not be two
  // emails: a confirmation arriving again reads as something having
  // happened.
  assert.equal(sent.length, 1, "the second press confirms nothing new");
});

test("the confirmation says what was shared, with whom, and how to stop", async () => {
  await subscribe("artist", cookies.reader);

  const [letter] = sent;
  assert.equal(letter.to, "reader@vantaorigin.test");
  assert.equal(letter.kind, "transactional");
  assert.match(letter.subject, /subscribed to artist/i);
  // The part somebody may not have read on the page.
  assert.match(letter.text, /shared with artist/i);
  assert.match(letter.text, /unsubscribe/i);
  assert.match(letter.unsubscribeUrl, /^https:\/\/api\.vantaorigin\.com\/creators\/unsubscribe\?token=/);
});

test("subscribing to one creator is not subscribing to another", async () => {
  await subscribe("artist", cookies.reader);

  assert.equal((await ask("rival", cookies.reader)).json().subscribed, false);
  assert.equal(await rowFor("rival", "reader"), null);
});

test("unsubscribing while signed in stops it, and keeps the record", async () => {
  await subscribe("artist", cookies.reader);
  const res = await unsubscribe("artist", cookies.reader);

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().subscribed, false);

  const row = await rowFor("artist", "reader");
  // Kept rather than deleted: the row is the evidence of what they agreed
  // to and when they changed their mind.
  assert.equal(row.status, "unsubscribed");
  assert.ok(row.unsubscribedAt);
  assert.ok(row.consentAt);
});

test("coming back is a fresh yes, with a fresh date", async () => {
  await subscribe("artist", cookies.reader);
  const first = (await rowFor("artist", "reader")).consentAt;

  await unsubscribe("artist", cookies.reader);
  await new Promise((r) => setTimeout(r, 10));
  await subscribe("artist", cookies.reader);

  const row = await rowFor("artist", "reader");
  assert.equal(row.status, "subscribed");
  assert.equal(row.unsubscribedAt, null);
  // The old date described a decision they have since reversed.
  assert.ok(row.consentAt > first, "the consent date moves");
});

test("the link in the email works with nobody signed in", async () => {
  await subscribe("artist", cookies.reader);
  const { token } = await rowFor("artist", "reader");

  const res = await app.inject({
    method: "GET",
    url: `/creators/unsubscribe?token=${encodeURIComponent(token)}`,
  });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /unsubscribed/i);
  assert.match(res.body, /artist/);
  assert.equal((await rowFor("artist", "reader")).status, "unsubscribed");
});

test("a mail client's one click button works too", async () => {
  await subscribe("artist", cookies.reader);
  const { token } = await rowFor("artist", "reader");

  const res = await app.inject({
    method: "POST",
    url: `/creators/unsubscribe?token=${encodeURIComponent(token)}`,
  });

  assert.equal(res.statusCode, 204);
  assert.equal((await rowFor("artist", "reader")).status, "unsubscribed");
});

test("a token nobody issued is not called expired", async () => {
  const res = await app.inject({ method: "GET", url: "/creators/unsubscribe?token=made-up" });

  assert.equal(res.statusCode, 200);
  // The most common reason for a link matching nothing is a second press
  // after it already worked.
  assert.match(res.body, /used it already/i);
  assert.doesNotMatch(res.body, /expired/i);
});

test("one person's token cannot touch anybody else's subscription", async () => {
  await subscribe("artist", cookies.reader);
  await subscribe("rival", cookies.reader);

  const { token } = await rowFor("artist", "reader");
  await app.inject({ method: "GET", url: `/creators/unsubscribe?token=${encodeURIComponent(token)}` });

  assert.equal((await rowFor("artist", "reader")).status, "unsubscribed");
  assert.equal((await rowFor("rival", "reader")).status, "subscribed");
});

test("a visitor with no account is sent to sign in rather than silently ignored", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/public/creators/artist/subscribe",
    payload: {},
  });

  assert.equal(res.statusCode, 401);
});

test("an unconfirmed address cannot be handed to a creator", async () => {
  const [reader] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(email) = ${people.reader.email}`);
  await db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, reader.id));

  const res = await subscribe("artist", cookies.reader);

  // An address nobody has confirmed might not belong to the person typing
  // it, and this is the one action that gives it to somebody else.
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().needsVerification, true);
  assert.equal(await rowFor("artist", "reader"), null);

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, reader.id));
});

test("subscribing to somebody who does not exist says so", async () => {
  const res = await subscribe("nobody-at-all", cookies.reader);
  assert.equal(res.statusCode, 404);
});

test("a reader can see which creators they subscribed to, and only their own", async () => {
  await subscribe("artist", cookies.reader);
  await subscribe("rival", cookies.reader);
  await subscribe("artist", cookies.rival);

  const mine = (await app.inject({
    method: "GET",
    url: "/me/subscriptions",
    headers: { cookie: cookies.reader },
  })).json();

  assert.equal(mine.subscriptions.length, 2);
  assert.deepEqual(mine.subscriptions.map((s) => s.username).sort(), ["@artist", "@rival"]);
});

// Somebody who left and came back does get a confirmation, because for
// them something did happen. The guard is against a repeated press, not
// against a real decision made twice.
test("coming back after leaving confirms again", async () => {
  await subscribe("artist", cookies.reader);
  assert.equal(sent.length, 1);

  await unsubscribe("artist", cookies.reader);
  await subscribe("artist", cookies.reader);

  assert.equal(sent.length, 2);
});
