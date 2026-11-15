// Something said to everybody at once.
//
// The newsletter goes to people who asked for it. This goes to people who
// cannot refuse it, which is why most of these tests are about the things
// that make somebody stop and think before pressing send: a reason that has
// to be chosen, an audience size that has to be agreed to, and a record of
// who did it.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";

const dataDir = ".pglite-broadcasts-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { broadcasts, emailLog, suppressionList, termsVersions, users } = await import(
  "../src/db/schema.js"
);
const { mailer } = await import("../src/adapters/email.js");
const { deliver, countAudience } = await import("../src/broadcast-send.js");
const { broadcastRecipients } = await import("../src/db/schema.js");

// What the real sender decided about each person, rather than what a stub
// was handed. The suppression rules live inside mailer.send(), so a test
// that replaces the whole of it cannot test them: it has replaced the thing
// under test. These read the record the send loop writes.
const outcomesFor = async (broadcastId) => {
  const rows = await db
    .select()
    .from(broadcastRecipients)
    .where(eq(broadcastRecipients.broadcastId, broadcastId));
  return Object.fromEntries(rows.map((r) => [r.email, r.outcome]));
};

let app;
let boss = "";
let ordinary = "";
let sent = [];
const realSend = mailer.send;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const make = async (username, email) => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email, username, password: "supersecret1" },
  });
  return cookieFrom(res);
};

const post = (url, cookie, payload = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload });

const get = (url, cookie) =>
  app.inject({ method: "GET", url, headers: cookie ? { cookie } : {} });

// A draft with something in it.
const draft = async (extra = {}) => {
  const made = await post("/admin/broadcasts", boss, {
    subject: "We are changing the terms",
    blocks: [{ type: "text", text: "Here is what is changing and when." }],
    ...extra,
  });
  return made.json();
};

before(async () => {
  await migrate();
  app = await buildApp();

  boss = await make("boss", "boss@vantaorigin.test");
  ordinary = await make("nobody", "nobody@vantaorigin.test");
  await make("reader", "reader@vantaorigin.test");
  await make("quitter", "quitter@vantaorigin.test");

  // Everybody has confirmed their address, which is what makes them part of
  // the audience.
  await db.update(users).set({ emailVerifiedAt: new Date() });

  await db.insert(termsVersions).values({
    version: "2026-11-14",
    effectiveDate: new Date("2026-12-01T00:00:00Z"),
    summary: "Subscriber data sharing",
  });

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
  // Two tests below need the real sender, so it is put back each time
  // rather than left swapped out for whatever runs next.
  mailer.send = async (message) => {
    sent.push(message);
    return { id: `test-${sent.length}` };
  };
  await db.delete(emailLog);
  await db.delete(broadcasts);
  await db.delete(suppressionList);
  sent = [];
});

// --- who may do this -----------------------------------------------------

test("an ordinary creator cannot see or make an announcement", async () => {
  assert.equal((await get("/admin/broadcasts", ordinary)).statusCode, 404);
  assert.equal((await post("/admin/broadcasts", ordinary, { subject: "Hi" })).statusCode, 404);
});

test("a visitor with no account is turned away", async () => {
  assert.equal((await get("/admin/broadcasts")).statusCode, 401);
});

// --- the reason is not a label -------------------------------------------

test("one without a reason will not send", async () => {
  const made = await draft();
  const res = await post(`/admin/broadcasts/${made.id}/send`, boss, { audienceCount: 4 });

  assert.equal(res.statusCode, 400);
  // It decides who this reaches, so sending without one would be sending
  // without having decided that.
  assert.match(res.json().error, /Choose why this is being sent/i);
  assert.equal(sent.length, 0);
});

test("a terms change will not send without the version it announces", async () => {
  const made = await draft({ reasonCategory: "terms_change" });
  const res = await post(`/admin/broadcasts/${made.id}/send`, boss, { audienceCount: 4 });

  assert.equal(res.statusCode, 400);
  // Otherwise the banner has no version to ask anybody to accept.
  assert.match(res.json().error, /needs the version/i);
});

test("the preview says plainly whether this reaches people who reported us", async () => {
  const unavoidable = await draft({ reasonCategory: "security_notice" });
  const ordinaryOne = await draft({ reasonCategory: "downtime" });

  assert.equal((await get(`/admin/broadcasts/${unavoidable.id}/preview`, boss)).json().reachesSuppressed, true);
  assert.equal((await get(`/admin/broadcasts/${ordinaryOne.id}/preview`, boss)).json().reachesSuppressed, false);
});

// --- the audience --------------------------------------------------------

test("it reaches every confirmed account, including people who left the newsletter", async () => {
  // Off the newsletter entirely, and still an account holder.
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(sql`lower(email) = 'quitter@vantaorigin.test'`);
  await app.inject({
    method: "POST",
    url: "/newsletter/unsubscribe",
    payload: { token: "nothing" },
  });

  const made = await draft({ reasonCategory: "terms_change", termsVersion: "2026-11-14" });
  const result = await deliver(null, made.id);

  const addresses = sent.map((m) => m.to).sort();
  assert.equal(result.sent, 4);
  // A change to the terms governs the account somebody holds. Pressing
  // unsubscribe on a newsletter does not discharge the duty to tell them.
  assert.ok(addresses.includes("quitter@vantaorigin.test"));
  assert.ok(addresses.includes("reader@vantaorigin.test"));
});

test("somebody who never confirmed their address is left out", async () => {
  const before = await countAudience();
  await db
    .update(users)
    .set({ emailVerifiedAt: null })
    .where(sql`lower(email) = 'reader@vantaorigin.test'`);

  assert.equal(await countAudience(), before - 1);

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(sql`lower(email) = 'reader@vantaorigin.test'`);
});

test("the number has to be the number they agreed to", async () => {
  const made = await draft({ reasonCategory: "downtime" });

  const stale = await post(`/admin/broadcasts/${made.id}/send`, boss, { audienceCount: 99 });

  assert.equal(stale.statusCode, 409);
  assert.match(stale.json().error, /number of people changed/i);
  assert.equal(stale.json().audienceCount, 4);
  assert.equal(sent.length, 0);

  const right = await post(`/admin/broadcasts/${made.id}/send`, boss, { audienceCount: 4 });
  assert.equal(right.statusCode, 200);
});

// --- what the suppression rules do here ----------------------------------

test("a complaint does not stop a security notice, and does stop a downtime one", async () => {
  // The real sender, because the rule being tested lives inside it.
  mailer.send = realSend;
  await db
    .insert(suppressionList)
    .values({ email: "reader@vantaorigin.test", reason: "complaint", note: "reported as spam" });

  const security = await draft({ reasonCategory: "security_notice" });
  await deliver(null, security.id);
  assert.equal(
    (await outcomesFor(security.id))["reader@vantaorigin.test"],
    "sent",
    "a security notice still reaches somebody who reported us"
  );

  const downtime = await draft({ reasonCategory: "downtime" });
  const result = await deliver(null, downtime.id);

  assert.equal(
    (await outcomesFor(downtime.id))["reader@vantaorigin.test"],
    "skipped",
    "a maintenance window does not"
  );
  // Refused on purpose, not a failure.
  assert.equal(result.skipped, 1);
  assert.equal(result.failed, 0);
});

test("a hard bounce stops even an announcement, because the mailbox is gone", async () => {
  mailer.send = realSend;
  await db
    .insert(suppressionList)
    .values({ email: "reader@vantaorigin.test", reason: "hard_bounce", note: "gone" });

  const made = await draft({ reasonCategory: "security_notice" });
  const result = await deliver(null, made.id);

  // An address that does not exist cannot be told anything, whatever the
  // duty to tell them.
  assert.equal((await outcomesFor(made.id))["reader@vantaorigin.test"], "skipped");
  assert.equal(result.skipped, 1);
});

// --- the audit -----------------------------------------------------------

test("the record says who wrote it, who sent it, when, and to how many", async () => {
  const made = await draft({ reasonCategory: "downtime" });
  assert.equal(made.createdByEmail, "boss@vantaorigin.test");

  await post(`/admin/broadcasts/${made.id}/send`, boss, { audienceCount: 4 });

  // The route answers at once and works through the list behind it, so the
  // finished state is waited for rather than assumed.
  let row;
  for (let i = 0; i < 60; i += 1) {
    [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, made.id));
    if (row.status === "sent") break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.equal(row.sentByEmail, "boss@vantaorigin.test");
  assert.equal(row.audienceCount, 4);
  assert.equal(row.status, "sent");
  assert.ok(row.sentAt);
  assert.equal(row.sentCount, 4);
});

test("what was already sent cannot be edited or deleted", async () => {
  const made = await draft({ reasonCategory: "downtime" });
  await db.update(broadcasts).set({ status: "sent" }).where(eq(broadcasts.id, made.id));

  const edit = await app.inject({
    method: "PATCH",
    url: `/admin/broadcasts/${made.id}`,
    headers: { cookie: boss },
    payload: { subject: "Something else entirely" },
  });
  const gone = await app.inject({
    method: "DELETE",
    url: `/admin/broadcasts/${made.id}`,
    headers: { cookie: boss },
  });

  // The sent ones are the audit. Changing one would leave the record
  // describing a letter nobody received.
  assert.equal(edit.statusCode, 409);
  assert.equal(gone.statusCode, 409);
});

// --- sending twice -------------------------------------------------------

test("a send that stops halfway carries on without writing to anybody twice", async () => {
  const made = await draft({ reasonCategory: "downtime" });

  // One copy goes, then everything falls over.
  let count = 0;
  const working = mailer.send;
  mailer.send = async (message) => {
    count += 1;
    if (count > 1) throw new Error("the sender stopped answering");
    return working(message);
  };
  await deliver(null, made.id);
  mailer.send = working;

  const reached = sent.map((m) => m.to);
  assert.equal(reached.length, 1);

  sent = [];
  await db.update(broadcasts).set({ status: "draft" }).where(eq(broadcasts.id, made.id));
  await deliver(null, made.id);

  // Nobody hears it twice, including the one who already did.
  assert.ok(!sent.map((m) => m.to).includes(reached[0]));
});

// --- the letter itself ---------------------------------------------------

test("the footer does not claim they joined a newsletter", async () => {
  const made = await draft({ reasonCategory: "privacy_change" });
  await deliver(null, made.id);

  const [letter] = sent;
  assert.equal(letter.kind, "service_announcement");
  assert.equal(letter.reasonCategory, "privacy_change");
  // They are getting this because they hold an account, and saying
  // otherwise would be a false sentence in an email about honesty.
  assert.doesNotMatch(letter.html, /joined the\s*<a[^>]*>VantaOrigin<\/a>\s*creator newsletter/i);
  assert.match(letter.html, /registered on/i);
  // And there is nothing here to unsubscribe from.
  assert.equal(letter.unsubscribeUrl, undefined);
});

test("a test copy says it is a test and touches nothing", async () => {
  const made = await draft({ reasonCategory: "downtime" });
  const res = await post(`/admin/broadcasts/${made.id}/test`, boss, { to: "boss@vantaorigin.test" });

  assert.equal(res.statusCode, 200);
  assert.match(sent[0].subject, /^\[Test\]/);

  const [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, made.id));
  assert.equal(row.status, "draft");
  assert.equal(row.sentCount, 0);
});
