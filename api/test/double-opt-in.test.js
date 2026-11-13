// Asking before sending.
//
// Somebody typing an address into a form is not consent, because the address
// might not be theirs. One tap on a link sent to it is, and it is the tap we
// can point at when asked how we got permission.
//
// The trap this creates, and the reason the welcome letter changed class: a
// new account is pending until it answers, so anything sent as marketing at
// sign-up would never arrive at all.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-optin-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { emailLog, emailPreferences, newsletterSubscribers, users } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");

let app;
let sent;
let realSend;

before(async () => {
  await migrate();
  app = await buildApp();
  realSend = mailer.send.bind(mailer);
});

after(async () => {
  mailer.send = realSend;
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  sent = [];
  mailer.send = async (letter) => {
    sent.push(letter);
    return { id: "caught" };
  };
  await db.delete(emailLog);
});

const prefs = async (email) => {
  const [row] = await db
    .select()
    .from(emailPreferences)
    .innerJoin(users, sql`${users.id} = ${emailPreferences.userId}`)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  return row?.email_preferences ?? null;
};

const tokenFor = async (email) => {
  const [row] = await db
    .select({ token: newsletterSubscribers.token })
    .from(newsletterSubscribers)
    .where(sql`lower(${newsletterSubscribers.email}) = ${email.toLowerCase()}`);
  return row?.token;
};

test("the footer form asks before it sends anything", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "curious@example.test" },
  });
  assert.equal(res.statusCode, 200);

  await new Promise((r) => setTimeout(r, 60));
  const ask = sent.find((l) => l.template === "confirm-subscription");
  assert.ok(ask, "a confirmation should have been sent");
  assert.equal(ask.kind, "transactional", "sent as marketing it could never arrive");
  assert.match(ask.html, /\/newsletter\/confirm\?token=/);
});

test("a new account starts pending, not subscribed", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "newbie@vantaorigin.test", username: "newbie", password: "supersecret1" },
  });

  const row = await prefs("newbie@vantaorigin.test");
  assert.equal(row.marketingStatus, "pending", "making an account is not asking for the newsletter");
  assert.equal(row.consentSource, "signup");
  assert.equal(row.consentAt, null, "nobody has consented yet");
});

test("the welcome letter still arrives, and carries the ask", async () => {
  // It was marketing until double opt-in arrived. A pending account cannot
  // receive marketing, so as marketing it would never have been sent.
  await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "welcomed@vantaorigin.test", username: "welcomed", password: "supersecret1" },
  });
  await new Promise((r) => setTimeout(r, 120));
  const welcome = sent.find((l) => l.template === "welcome");
  assert.ok(welcome, "a new account should still be welcomed");
  assert.equal(welcome.kind, "transactional");
  assert.match(welcome.html, /\/newsletter\/confirm\?token=/, "the ask rides along inside it");
});

test("tapping the link is the moment consent exists, and it is recorded", async () => {
  const token = await tokenFor("newbie@vantaorigin.test");
  const res = await app.inject({ method: "GET", url: `/newsletter/confirm?token=${token}` });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /You are on the list/);

  const row = await prefs("newbie@vantaorigin.test");
  assert.equal(row.marketingStatus, "subscribed");
  assert.ok(row.consentAt, "when");
  assert.equal(row.consentSource, "double_opt_in", "how");
  assert.equal(row.needsConsentReview, false, "confirmed by hand, so nothing to review");
});

test("confirming twice is confirming once", async () => {
  // A link in an inbox gets tapped twice, and mail clients prefetch it
  // before anybody reads it.
  const token = await tokenFor("newbie@vantaorigin.test");
  for (let i = 0; i < 3; i += 1) {
    const res = await app.inject({ method: "GET", url: `/newsletter/confirm?token=${token}` });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /You are on the list/);
  }
  assert.equal((await prefs("newbie@vantaorigin.test")).marketingStatus, "subscribed");
});

test("a token nobody issued is not called expired", async () => {
  const res = await app.inject({ method: "GET", url: "/newsletter/confirm?token=never-issued" });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /could not find that invitation/i);
  assert.ok(!res.body.includes("expired"), "these links do not expire");
});

test("the newsletter reaches them only after they have answered", async () => {
  mailer.send = realSend;

  await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "quiet@vantaorigin.test", username: "quiet", password: "supersecret1" },
  });

  const letter = {
    to: "quiet@vantaorigin.test",
    subject: "s", html: "<p>h</p>", text: "t",
    kind: "marketing", template: "issue",
  };

  const before = await mailer.send(letter);
  assert.equal(before.blocked, true, "pending means not yet");
  assert.match(before.reason, /pending/);

  await app.inject({ method: "GET", url: `/newsletter/confirm?token=${await tokenFor("quiet@vantaorigin.test")}` });

  const after = await mailer.send(letter);
  assert.ok(!after.blocked, "and now it may");
});
