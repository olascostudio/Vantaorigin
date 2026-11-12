// The class on every email, and the addresses we have stopped writing to.
//
// This is the spine of the sending system: one class per send, decided by the
// sender and not by the caller, recorded whatever happens. If a send can get
// out without a class, nothing further up can be trusted, because the thing
// deciding who may receive what has nothing to decide on.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-email-class-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { emailLog, suppressionList } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");
const { MARKETING, PRODUCT_NOTIFICATION, SERVICE_ANNOUNCEMENT, TRANSACTIONAL } = await import(
  "../src/email-classes.js"
);

before(async () => {
  await migrate();
});

after(async () => {
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(emailLog);
  await db.delete(suppressionList);
});

const letter = (extra = {}) => ({
  to: "reader@vantaorigin.test",
  subject: "A subject",
  html: "<p>Words.</p>",
  text: "Words.",
  ...extra,
});

const logFor = async (email) =>
  db.select().from(emailLog).where(sql`lower(${emailLog.email}) = ${email.toLowerCase()}`);

const suppress = (email, reason) =>
  db.insert(suppressionList).values({ email, reason, note: "for a test" });

// ---- the rule itself -------------------------------------------------------

test("a send with no class is refused", async () => {
  // Thrown rather than defaulted. A default means the next person to add a
  // send picks the class by accident, which is how a marketing email ends up
  // classified as transactional and sent to everybody.
  await assert.rejects(() => mailer.send(letter()), /needs a class/i);
  await assert.rejects(() => mailer.send(letter({ kind: "" })), /needs a class/i);
  await assert.rejects(() => mailer.send(letter({ kind: null })), /needs a class/i);
});

test("a class we do not have is refused, rather than passed through", async () => {
  await assert.rejects(() => mailer.send(letter({ kind: "promotional" })), /needs a class/i);
  await assert.rejects(() => mailer.send(letter({ kind: "TRANSACTIONAL" })), /needs a class/i);

  assert.equal((await logFor("reader@vantaorigin.test")).length, 0, "nothing should be logged");
});

test("each of the four classes is accepted", async () => {
  for (const kind of [TRANSACTIONAL, SERVICE_ANNOUNCEMENT, PRODUCT_NOTIFICATION, MARKETING]) {
    await mailer.send(letter({ kind, template: "probe" }));
  }

  const rows = await logFor("reader@vantaorigin.test");
  assert.deepEqual(
    rows.map((r) => r.class).sort(),
    [MARKETING, PRODUCT_NOTIFICATION, SERVICE_ANNOUNCEMENT, TRANSACTIONAL].sort()
  );
});

// ---- the log ---------------------------------------------------------------

test("every send is written down, with its class", async () => {
  await mailer.send(letter({ kind: TRANSACTIONAL, template: "verification" }));

  const [row] = await logFor("reader@vantaorigin.test");
  assert.equal(row.class, TRANSACTIONAL);
  assert.equal(row.template, "verification");
  assert.equal(row.status, "sent");
  assert.ok(row.createdAt, "should be stamped");
});

test("a send that fails is written down too, with the reason", async () => {
  // The failures are the interesting half: a log that only holds successes
  // cannot answer the question anybody actually asks.
  const { mailer: fresh } = await import("../src/adapters/email.js");
  const realFetch = globalThis.fetch;
  process.env.EMAIL_DRIVER = "console";

  // Make the transport throw by handing it something it cannot print.
  const brokenConsole = console.log;
  console.log = () => {
    throw new Error("the transport fell over");
  };
  try {
    await assert.rejects(() => fresh.send(letter({ kind: MARKETING, template: "issue" })));
  } finally {
    console.log = brokenConsole;
    globalThis.fetch = realFetch;
  }

  const [row] = await logFor("reader@vantaorigin.test");
  assert.equal(row.status, "failed");
  assert.match(row.error, /fell over/);
});

test("the address is kept beside the id, for people with no account", async () => {
  await mailer.send(letter({ to: "stranger@example.test", kind: MARKETING }));

  const [row] = await logFor("stranger@example.test");
  assert.equal(row.email, "stranger@example.test");
  assert.equal(row.userId, null, "a stranger has no id and that is fine");
});

// ---- suppression -----------------------------------------------------------

test("a hard bounce stops everything, including a password reset", async () => {
  // The address does not exist. Sending again is shouting at a wall, and the
  // provider counts it against the domain, which is how a reset stops
  // arriving for everybody else.
  await suppress("gone@vantaorigin.test", "hard_bounce");

  for (const kind of [TRANSACTIONAL, SERVICE_ANNOUNCEMENT, PRODUCT_NOTIFICATION, MARKETING]) {
    const answer = await mailer.send(letter({ to: "gone@vantaorigin.test", kind }));
    assert.equal(answer.blocked, true, `${kind} should have been blocked`);
    assert.match(answer.reason, /hard bounce/i);
  }
});

test("a complaint stops the mail they did not ask for and leaves the rest", async () => {
  // They pressed "spam". They still have an account, and may still be locked
  // out of it tomorrow.
  await suppress("cross@vantaorigin.test", "complaint");

  const reset = await mailer.send(letter({ to: "cross@vantaorigin.test", kind: TRANSACTIONAL }));
  assert.ok(!reset.blocked, "a password reset should still go");

  for (const kind of [MARKETING, SERVICE_ANNOUNCEMENT, PRODUCT_NOTIFICATION]) {
    const answer = await mailer.send(letter({ to: "cross@vantaorigin.test", kind }));
    assert.equal(answer.blocked, true, `${kind} should have been blocked`);
  }
});

test("a blocked send is written down, not silently dropped", async () => {
  await suppress("gone@vantaorigin.test", "hard_bounce");
  await mailer.send(letter({ to: "gone@vantaorigin.test", kind: MARKETING, template: "issue" }));

  const [row] = await logFor("gone@vantaorigin.test");
  assert.equal(row.status, "blocked");
  assert.equal(row.class, MARKETING);
  assert.match(row.error, /hard bounce/i);
  // A send that never happened is exactly the thing somebody comes asking
  // about, so it has to leave a trace.
});

test("suppression does not care about case or stray spaces", async () => {
  await suppress("Shouty@Vantaorigin.TEST", "hard_bounce");

  const answer = await mailer.send(letter({ to: "  shouty@vantaorigin.test  ", kind: TRANSACTIONAL }));
  assert.equal(answer.blocked, true, "the same mailbox is the same mailbox");
});

test("an address nobody suppressed is left alone", async () => {
  await suppress("gone@vantaorigin.test", "hard_bounce");

  const answer = await mailer.send(letter({ to: "fine@vantaorigin.test", kind: MARKETING }));
  assert.ok(!answer.blocked);
});
