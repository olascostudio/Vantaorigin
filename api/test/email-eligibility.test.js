// May this person be sent this, right now.
//
// The caller says who it wants to reach; the sender decides who it may
// reach. The spec's two demands live here: an unsubscribed person gets no
// newsletter and still gets a password reset, and marketing is refused for
// pending, unsubscribed, bounced and complained alike.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-eligibility-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { emailLog, emailPreferences, newsletterSubscribers, users } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");
const { MARKETING, PRODUCT_NOTIFICATION, TRANSACTIONAL } = await import("../src/email-classes.js");

let app;

before(async () => {
  await migrate();
  app = await buildApp();
  await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "reader@vantaorigin.test", username: "reader", password: "supersecret1" },
  });
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(emailLog);
});

const setStatus = async (status, extra = {}) => {
  const [who] = await db.select({ id: users.id }).from(users).where(sql`lower(email) = 'reader@vantaorigin.test'`);
  await db
    .insert(emailPreferences)
    .values({ userId: who.id, marketingStatus: status, ...extra })
    .onConflictDoUpdate({ target: emailPreferences.userId, set: { marketingStatus: status, ...extra } });
  return who.id;
};

const send = (kind, extra = {}) =>
  mailer.send({ to: "reader@vantaorigin.test", subject: "s", html: "<p>h</p>", text: "t", kind, ...extra });

test("an unsubscribed person gets no newsletter and still gets a password reset", async () => {
  await setStatus("unsubscribed");

  const letter = await send(MARKETING, { template: "issue" });
  assert.equal(letter.blocked, true);
  assert.match(letter.reason, /not subscribed/);

  const reset = await send(TRANSACTIONAL, { template: "reset" });
  assert.ok(!reset.blocked, "a reset must still arrive");
});

test("marketing is refused for pending, unsubscribed, bounced and complained", async () => {
  for (const status of ["pending", "unsubscribed", "bounced", "complained"]) {
    await setStatus(status);
    const answer = await send(MARKETING);
    assert.equal(answer.blocked, true, `${status} should have been refused`);
    assert.match(answer.reason, new RegExp(status));
  }
});

test("and allowed for somebody who confirmed", async () => {
  await setStatus("subscribed");
  const answer = await send(MARKETING);
  assert.ok(!answer.blocked);
});

test("a pause stops the newsletter until the date, and not after it", async () => {
  await setStatus("subscribed", { pausedUntil: new Date(Date.now() + 86400000) });
  const paused = await send(MARKETING);
  assert.equal(paused.blocked, true);
  assert.match(paused.reason, /paused until/);

  await setStatus("subscribed", { pausedUntil: new Date(Date.now() - 86400000) });
  const after = await send(MARKETING);
  assert.ok(!after.blocked, "a pause that has run out is not a pause");
});

test("a product notification follows its own switch", async () => {
  await setStatus("unsubscribed", { notifyComments: true, notifyBattleChallenges: false });

  // Unsubscribed from marketing changes nothing here: they are different
  // questions, which is the whole reason for the class system.
  const comment = await send(PRODUCT_NOTIFICATION, { category: "comments" });
  assert.ok(!comment.blocked);

  const battle = await send(PRODUCT_NOTIFICATION, { category: "battle_challenges" });
  assert.equal(battle.blocked, true);
  assert.match(battle.reason, /switched off/);
});

test("an address nobody holds consent for is not written to", async () => {
  const answer = await mailer.send({
    to: "stranger@example.test",
    subject: "s", html: "<p>h</p>", text: "t",
    kind: MARKETING,
  });
  assert.equal(answer.blocked, true);
  assert.match(answer.reason, /no consent on file/);
});

test("a footer subscriber with no account can still be sent the newsletter", async () => {
  await db.insert(newsletterSubscribers).values({
    email: "footer@example.test",
    status: "subscribed",
    source: "footer",
    token: "tok-footer",
  });

  const answer = await mailer.send({
    to: "footer@example.test",
    subject: "s", html: "<p>h</p>", text: "t",
    kind: MARKETING,
  });
  assert.ok(!answer.blocked, "not every subscriber is a user");
});

test("a refusal is written down with its reason", async () => {
  await setStatus("unsubscribed");
  await send(MARKETING, { template: "issue" });

  const [row] = await db.select().from(emailLog).where(sql`status = 'blocked'`);
  assert.equal(row.class, MARKETING);
  assert.match(row.error, /not subscribed/);
});
