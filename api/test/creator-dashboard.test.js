// A creator's own subscribers.
//
// The list of other people's email addresses is the most sensitive thing
// this product hands out, so most of this is about who can reach it and
// what leaves in the file.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

const dataDir = ".pglite-creator-dash-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { creatorSubscriptions, featureInterest, users } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");

let app;
const realSend = mailer.send;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const cookies = {};
const ids = {};

const make = async (username, email) => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email, username, password: "supersecret1" },
  });
  cookies[username] = cookieFrom(res);
  const [row] = await db.select({ id: users.id }).from(users).where(sql`lower(email) = ${email}`);
  ids[username] = row.id;
};

const get = (url, who) =>
  app.inject({ method: "GET", url, headers: who ? { cookie: cookies[who] } : {} });

// A subscriber written straight in, so a test can make twenty without
// twenty sign ups.
const subscriberFor = async (creator, email, { status = "subscribed", daysAgo = 0 } = {}) => {
  const [person] = await db
    .insert(users)
    .values({ email, username: email.split("@")[0], passwordHash: "x".repeat(60) })
    .returning({ id: users.id });

  const when = new Date(Date.now() - daysAgo * 86400000);
  await db.insert(creatorSubscriptions).values({
    creatorId: ids[creator],
    subscriberId: person.id,
    status,
    consentAt: when,
    unsubscribedAt: status === "unsubscribed" ? new Date() : null,
    token: randomUUID(),
    createdAt: when,
    updatedAt: when,
  });
  return person.id;
};

before(async () => {
  await migrate();
  app = await buildApp();
  mailer.send = async () => ({ id: "test" });

  await make("artist", "artist@vantaorigin.test");
  await make("rival", "rival@vantaorigin.test");
  await db.update(users).set({ emailVerifiedAt: new Date() });
});

after(async () => {
  mailer.send = realSend;
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(creatorSubscriptions);
  await db.delete(featureInterest);
  await db.delete(users).where(sql`email LIKE '%@readers.test'`);
});

// --- who can reach it ----------------------------------------------------

test("a visitor with no account gets nothing", async () => {
  for (const url of [
    "/me/creator/overview",
    "/me/creator/subscribers",
    "/me/creator/subscribers.csv",
    "/me/creator/activity",
  ]) {
    assert.equal((await get(url)).statusCode, 401, url);
  }
});

test("one creator cannot see another's subscribers, by any route", async () => {
  await subscriberFor("artist", "only-artists@readers.test");

  // The rival is signed in, and perfectly entitled to their own dashboard.
  // It is simply empty.
  assert.equal((await get("/me/creator/overview", "rival")).json().total, 0);
  assert.equal((await get("/me/creator/subscribers", "rival")).json().subscribers.length, 0);
  assert.equal((await get("/me/creator/activity", "rival")).json().activity.length, 0);

  const file = await get("/me/creator/subscribers.csv", "rival");
  assert.equal(file.statusCode, 200);
  assert.doesNotMatch(file.body, /only-artists@readers\.test/);

  // And the owner does see it, so the emptiness above is access control
  // rather than a query that returns nothing for everybody.
  assert.equal((await get("/me/creator/overview", "artist")).json().total, 1);
});

test("there is no parameter to point at somebody else", async () => {
  await subscriberFor("artist", "private@readers.test");

  // Every shape somebody might try. The route takes the creator from the
  // session and nothing else, so none of these change the answer.
  for (const query of [
    `?creatorId=${ids.artist}`,
    `?creator_id=${ids.artist}`,
    `?userId=${ids.artist}`,
    `?username=artist`,
    `?id=${ids.artist}`,
  ]) {
    const res = await get(`/me/creator/subscribers${query}`, "rival");
    assert.equal(res.json().subscribers.length, 0, query);
    assert.doesNotMatch(JSON.stringify(res.json()), /private@readers\.test/, query);
  }
});

// --- the numbers ---------------------------------------------------------

test("the overview counts the active, the new, and the ones who left", async () => {
  await subscriberFor("artist", "a@readers.test", { daysAgo: 1 });
  await subscriberFor("artist", "b@readers.test", { daysAgo: 3 });
  await subscriberFor("artist", "c@readers.test", { daysAgo: 40 });
  await subscriberFor("artist", "d@readers.test", { status: "unsubscribed", daysAgo: 10 });

  const body = (await get("/me/creator/overview", "artist")).json();

  assert.equal(body.total, 3, "unsubscribed people are not subscribers");
  assert.equal(body.thisWeek, 2);
  assert.equal(body.unsubscribed, 1);
  assert.ok(Array.isArray(body.growth));
  assert.ok(body.growth.length > 0);
});

// --- the list ------------------------------------------------------------

test("the table pages, and says how many pages there are", async () => {
  for (let i = 0; i < 30; i += 1) {
    await subscriberFor("artist", `reader${String(i).padStart(2, "0")}@readers.test`, { daysAgo: i });
  }

  const first = (await get("/me/creator/subscribers?limit=25", "artist")).json();
  assert.equal(first.subscribers.length, 25);
  assert.equal(first.total, 30);
  assert.equal(first.pages, 2);

  const second = (await get("/me/creator/subscribers?limit=25&page=2", "artist")).json();
  assert.equal(second.subscribers.length, 5);
  // No overlap: a page boundary that repeats a row is a row somebody
  // emails twice.
  const seen = new Set(first.subscribers.map((s) => s.email));
  assert.ok(second.subscribers.every((s) => !seen.has(s.email)));
});

test("search narrows by address", async () => {
  await subscriberFor("artist", "wanted@readers.test");
  await subscriberFor("artist", "somebody@readers.test");

  const found = (await get("/me/creator/subscribers?q=wanted", "artist")).json();
  assert.equal(found.subscribers.length, 1);
  assert.equal(found.subscribers[0].email, "wanted@readers.test");
  assert.equal(found.total, 1);
});

test("the table shows who left as well as who stayed", async () => {
  await subscriberFor("artist", "stayed@readers.test");
  await subscriberFor("artist", "left@readers.test", { status: "unsubscribed" });

  const rows = (await get("/me/creator/subscribers", "artist")).json().subscribers;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.status).sort(), ["subscribed", "unsubscribed"]);
});

// --- the file ------------------------------------------------------------

test("the export carries active subscribers only", async () => {
  await subscriberFor("artist", "active@readers.test");
  await subscriberFor("artist", "gone@readers.test", { status: "unsubscribed" });

  const res = await get("/me/creator/subscribers.csv", "artist");

  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.match(res.headers["content-disposition"], /artist-subscribers-\d{4}-\d{2}-\d{2}\.csv/);
  // A file of other people's addresses does not belong in a shared cache.
  assert.match(res.headers["cache-control"], /no-store/);

  assert.match(res.body, /active@readers\.test/);
  // Somebody who unsubscribed must not travel out in a file that outlives
  // our copy of their decision.
  assert.doesNotMatch(res.body, /gone@readers\.test/);
});

test("a formula in an address is written out as text, not as a formula", async () => {
  // `=` is a permitted character in a local part, so this is a legal
  // address and, unguarded, a live formula in every spreadsheet that opens
  // the file.
  await subscriberFor("artist", "=hyperlink(\"http://evil.test\")@readers.test");
  await subscriberFor("artist", "+15550000@readers.test");
  await subscriberFor("artist", "-minus@readers.test");
  await subscriberFor("artist", "@at@readers.test");

  const body = (await get("/me/creator/subscribers.csv", "artist")).body;

  for (const line of body.split("\r\n").slice(1)) {
    const first = line[0];
    assert.ok(
      !["=", "+", "-", "@"].includes(first),
      `a cell still begins with ${first}: ${line}`
    );
  }
  assert.match(body, /'=hyperlink/);
  assert.match(body, /'\+15550000/);
});

test("the header row is there even with nobody on the list", async () => {
  const res = await get("/me/creator/subscribers.csv", "artist");

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "email,subscribed");
});

// --- activity ------------------------------------------------------------

test("activity shows both directions, newest first", async () => {
  await subscriberFor("artist", "joined@readers.test", { daysAgo: 2 });
  await subscriberFor("artist", "departed@readers.test", { status: "unsubscribed", daysAgo: 1 });

  const rows = (await get("/me/creator/activity", "artist")).json().activity;

  assert.equal(rows.length, 2);
  // A creator watching their list shrink deserves to see it as plainly as
  // they see it grow.
  assert.deepEqual(rows.map((r) => r.kind).sort(), ["subscribed", "unsubscribed"]);
  assert.ok(rows.every((r) => r.at));
});

// --- the locked tab ------------------------------------------------------

test("asking to be told about a locked feature is recorded once", async () => {
  const press = () =>
    app.inject({
      method: "POST",
      url: "/me/creator/interest",
      headers: { cookie: cookies.artist },
      payload: { feature: "editor" },
    });

  assert.equal((await press()).statusCode, 200);
  assert.equal((await press()).statusCode, 200);

  const rows = await db.select().from(featureInterest).where(eq(featureInterest.userId, ids.artist));
  assert.equal(rows.length, 1, "pressing twice is pressing once");

  const mine = (await get("/me/creator/interest", "artist")).json();
  assert.deepEqual(mine.features, ["editor"]);
  // And it is theirs, not everybody's.
  assert.deepEqual((await get("/me/creator/interest", "rival")).json().features, []);
});

test("interest with no feature named is refused", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/me/creator/interest",
    headers: { cookie: cookies.artist },
    payload: {},
  });
  assert.equal(res.statusCode, 400);
});
