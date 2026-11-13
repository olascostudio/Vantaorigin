// The way back for an address we stopped writing to.
//
// Being on the suppression list means not even a password reset arrives, so
// being on it wrongly means losing the account. The webhook fills the list
// and never empties it; this is the only way out, which makes who may use
// it and what it leaves behind the two things worth holding still.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-suppression-admin-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { suppressionLifts, suppressionList, webhookEvents } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");
const { TRANSACTIONAL } = await import("../src/email-classes.js");

let app;
let boss = "";
let ordinary = "";

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const list = (cookie, query = "") =>
  app.inject({ method: "GET", url: `/admin/suppressions${query}`, headers: { cookie } });

const lift = (cookie, payload) =>
  app.inject({ method: "DELETE", url: "/admin/suppressions", headers: { cookie }, payload });

before(async () => {
  await migrate();
  app = await buildApp();

  boss = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "boss@vantaorigin.test", username: "boss", password: "supersecret1" },
    })
  );
  ordinary = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "nobody@vantaorigin.test", username: "nobody", password: "supersecret1" },
    })
  );
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(suppressionLifts);
  await db.delete(suppressionList);
  await db.delete(webhookEvents);
  await db.insert(suppressionList).values({
    email: "locked-out@example.com",
    reason: "hard_bounce",
    note: "bounced permanently: Permanent",
  });
});

test("an ordinary creator cannot see the list, and is not told it exists", async () => {
  const res = await list(ordinary);
  // 404, not 403: an admin screen somebody may not open should not confirm
  // it is there to be opened.
  assert.equal(res.statusCode, 404);
});

test("an ordinary creator cannot lift one", async () => {
  const res = await lift(ordinary, { email: "locked-out@example.com", note: "let me in" });

  assert.equal(res.statusCode, 404);
  assert.equal((await db.select().from(suppressionList)).length, 1);
});

test("a visitor with no account at all is turned away", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/suppressions" });
  assert.equal(res.statusCode, 401);
});

test("an admin sees the address, why, and what the sender actually said", async () => {
  // The bounce that caused it, kept whole by the webhook endpoint.
  await db.insert(webhookEvents).values({
    providerEventId: randomUUID(),
    eventType: "email.bounced",
    email: "locked-out@example.com",
    payload: {
      type: "email.bounced",
      data: {
        to: ["locked-out@example.com"],
        bounce: {
          type: "Permanent",
          subType: "General",
          diagnosticCode: "smtp; 550 5.1.1 user unknown",
        },
      },
    },
  });

  const body = (await list(boss)).json();
  const [row] = body.suppressions;

  assert.equal(body.total, 1);
  assert.equal(row.email, "locked-out@example.com");
  assert.equal(row.reason, "hard_bounce");
  // The sender's own words, not our summary of them: deciding whether a
  // permanent bounce was really permanent needs the diagnostic line.
  assert.equal(row.bounceType, "Permanent");
  assert.match(row.diagnostic, /550 5\.1\.1/);
});

test("lifting it lets mail through again", async () => {
  // Blocked to begin with, including the password reset.
  const before = await mailer.send({
    to: "locked-out@example.com",
    kind: TRANSACTIONAL,
    template: "reset",
    subject: "Your code",
    html: "<p>123456</p>",
    text: "123456",
  });
  assert.equal(before.blocked, true);

  const res = await lift(boss, {
    email: "locked-out@example.com",
    note: "their mail server was misconfigured, they wrote in",
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().was, "hard_bounce");

  const after = await mailer.send({
    to: "locked-out@example.com",
    kind: TRANSACTIONAL,
    template: "reset",
    subject: "Your code",
    html: "<p>123456</p>",
    text: "123456",
  });
  assert.equal(after.blocked, undefined, "mail reaches them again");
});

test("lifting keeps a record of itself, because it destroys the one that was there", async () => {
  await lift(boss, { email: "locked-out@example.com", note: "a misconfigured server" });

  assert.equal((await db.select().from(suppressionList)).length, 0);

  const [kept] = await db.select().from(suppressionLifts);
  assert.equal(kept.email, "locked-out@example.com");
  // What it had been suppressed for, copied before the row went.
  assert.equal(kept.wasReason, "hard_bounce");
  assert.match(kept.wasNote, /bounced permanently/);
  assert.ok(kept.wasSuppressedAt);
  // And who decided otherwise. This is a decision about somebody's access
  // to their own account; it has to be answerable later.
  assert.equal(kept.liftedBy, "boss@vantaorigin.test");
  assert.equal(kept.note, "a misconfigured server");
});

test("a lift with no reason given is refused", async () => {
  const res = await lift(boss, { email: "locked-out@example.com" });

  assert.equal(res.statusCode, 400);
  // The record is the point. A blank one would be worse than none, because
  // it would look like somebody had thought about it.
  assert.equal((await db.select().from(suppressionList)).length, 1);
});

test("lifting an address that is not suppressed says so", async () => {
  const res = await lift(boss, { email: "never-blocked@example.com", note: "just in case" });

  assert.equal(res.statusCode, 404);
  assert.equal((await db.select().from(suppressionLifts)).length, 0);
});

test("the address is matched however it was capitalised", async () => {
  const res = await lift(boss, { email: "Locked-Out@Example.COM", note: "same person" });

  assert.equal(res.statusCode, 200);
  assert.equal((await db.select().from(suppressionList)).length, 0);
});

test("the search narrows by address", async () => {
  await db.insert(suppressionList).values([
    { email: "someone@elsewhere.net", reason: "complaint", note: "reported as spam" },
    { email: "another@elsewhere.net", reason: "hard_bounce", note: "gone" },
  ]);

  const found = (await list(boss, "?q=elsewhere")).json();
  assert.equal(found.suppressions.length, 2);
  // The total is the whole list, not the page: an admin filtering needs to
  // know how much they are not looking at.
  assert.equal(found.total, 3);
});

test("what has already been lifted is shown beside what still is", async () => {
  await lift(boss, { email: "locked-out@example.com", note: "wrote in" });

  const body = (await list(boss)).json();
  assert.equal(body.suppressions.length, 0);
  assert.equal(body.lifts.length, 1);
  assert.equal(body.lifts[0].liftedBy, "boss@vantaorigin.test");
});

test("an address lifted and then bouncing again comes straight back", async () => {
  await lift(boss, { email: "locked-out@example.com", note: "giving it another go" });

  // The webhook does not know or care that somebody lifted it. If the
  // mailbox really is gone, the next bounce suppresses it again, and the
  // lift record is what tells the story afterwards.
  await db.insert(suppressionList).values({
    email: "locked-out@example.com",
    reason: "hard_bounce",
    note: "bounced permanently: Permanent",
  });

  const body = (await list(boss)).json();
  assert.equal(body.suppressions.length, 1);
  assert.equal(body.lifts.length, 1);
});
