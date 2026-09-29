// The newsletter list: joining from the footer, joining by making an account,
// and leaving from a link in an email with nobody signed in.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-newsletter-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");

let app;

const rowFor = async (email) => {
  const [row] = await db
    .select()
    .from(schema.newsletterSubscribers)
    .where(sql`lower(${schema.newsletterSubscribers.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return row ?? null;
};

before(async () => {
  await migrate();
  app = await buildApp();
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("the footer form puts an address on the list", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "Reader@Example.com" },
  });

  assert.equal(res.statusCode, 200);
  const row = await rowFor("reader@example.com");
  // Stored in one shape, whatever case it was typed in.
  assert.equal(row.email, "reader@example.com");
  assert.equal(row.status, "subscribed");
  assert.equal(row.source, "footer");
  assert.ok(row.token);
});

test("offering the same address again is not an error, and makes no second row", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "reader@example.com" },
  });

  assert.equal(res.statusCode, 200);
  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(schema.newsletterSubscribers)
    .where(sql`lower(${schema.newsletterSubscribers.email}) = 'reader@example.com'`);
  assert.equal(count, 1);
});

test("something that is not an address is turned away", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "not-an-address" },
  });
  assert.equal(res.statusCode, 400);
});

test("making an account puts you on the list", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "joiner@vantaorigin.test", username: "joiner", password: "supersecret1" },
  });

  assert.equal(res.statusCode, 201);
  const row = await rowFor("joiner@vantaorigin.test");
  assert.equal(row.status, "subscribed");
  assert.equal(row.source, "signup");
});

test("the link in an email takes you off, with nobody signed in", async () => {
  const before = await rowFor("reader@example.com");

  const res = await app.inject({ method: "GET", url: `/newsletter/unsubscribe?token=${before.token}` });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/html/);
  assert.match(res.body, /unsubscribed/i);

  const after = await rowFor("reader@example.com");
  assert.equal(after.status, "unsubscribed");
  assert.ok(after.unsubscribedAt);
});

test("a mail app's own unsubscribe button works too", async () => {
  const row = await rowFor("joiner@vantaorigin.test");
  const res = await app.inject({
    method: "POST",
    url: `/newsletter/unsubscribe?token=${row.token}`,
  });

  assert.equal(res.statusCode, 200);
  assert.equal((await rowFor("joiner@vantaorigin.test")).status, "unsubscribed");
});

test("a made-up token changes nothing and says so kindly", async () => {
  const res = await app.inject({ method: "GET", url: "/newsletter/unsubscribe?token=nonsense" });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /expired/i);
});

test("somebody who left and comes back is welcomed back, in place", async () => {
  const gone = await rowFor("reader@example.com");

  const res = await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "reader@example.com" },
  });
  assert.equal(res.statusCode, 200);

  const back = await rowFor("reader@example.com");
  assert.equal(back.id, gone.id);
  assert.equal(back.status, "subscribed");
  assert.equal(back.unsubscribedAt, null);
});

test("the welcome letter carries a link that really takes you off", async () => {
  const { mailer } = await import("../src/adapters/email.js");
  const sent = [];
  const realSend = mailer.send;
  mailer.send = async (message) => {
    sent.push(message);
    return { id: "test" };
  };

  try {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "letter@vantaorigin.test", username: "letterreader", password: "supersecret1" },
    });
    assert.equal(res.statusCode, 201);

    // The letter is sent without being waited on, so give it a tick.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const letter = sent.find((message) => message.subject === "Welcome to VantaOrigin");
    assert.ok(letter, "the welcome letter went out");

    // The header a mail app reads to offer its own unsubscribe button.
    assert.ok(letter.unsubscribeUrl, "and carries somewhere to go");
    assert.match(letter.html, /Unsubscribe/);
    assert.match(letter.text, /To leave it: http/);

    // Not just a link -- a link that works.
    const token = new URL(letter.unsubscribeUrl).searchParams.get("token");
    const goodbye = await app.inject({ method: "GET", url: `/newsletter/unsubscribe?token=${token}` });
    assert.equal(goodbye.statusCode, 200);
    assert.match(goodbye.body, /unsubscribed/i);
    assert.equal((await rowFor("letter@vantaorigin.test")).status, "unsubscribed");
  } finally {
    mailer.send = realSend;
  }
});
