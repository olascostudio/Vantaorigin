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
const { subscribe } = await import("../src/newsletter.js");

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

  // Sent the way a mail provider really sends it: one-click unsubscribe is a
  // web form post, not JSON. Asking without a body would pass whether or not
  // the server could read the one that actually arrives.
  const res = await app.inject({
    method: "POST",
    url: `/newsletter/unsubscribe?token=${row.token}`,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: "List-Unsubscribe=One-Click",
  });

  assert.equal(res.statusCode, 200);
  assert.equal((await rowFor("joiner@vantaorigin.test")).status, "unsubscribed");
});

test("the one-click button is answered kindly even for a token we do not know", async () => {
  // A provider reads a failure here as a broken list and holds it against
  // every later letter.
  const res = await app.inject({
    method: "POST",
    url: "/newsletter/unsubscribe?token=nonsense",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: "List-Unsubscribe=One-Click",
  });
  assert.equal(res.statusCode, 200);
});

test("the token may come in the body as well as the address", async () => {
  await app.inject({ method: "POST", url: "/newsletter/subscribe", payload: { email: "form@example.com" } });
  const row = await rowFor("form@example.com");

  const res = await app.inject({
    method: "POST",
    url: "/newsletter/unsubscribe",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: new URLSearchParams({ token: row.token, "List-Unsubscribe": "One-Click" }).toString(),
  });

  assert.equal(res.statusCode, 200);
  assert.equal((await rowFor("form@example.com")).status, "unsubscribed");
});

test("the same new address offered twice at once makes one row, not an error", async () => {
  // The real race, reproduced rather than hoped for. subscribe() looks for the
  // address and finds nothing; the row is then written underneath it, so its
  // own insert is the one the unique index turns away. Asking twice over HTTP
  // would not do it -- the queries queue up, and the second read already sees
  // the first row.
  const pending = subscribe("racer@example.com", "footer");
  await db
    .insert(schema.newsletterSubscribers)
    .values({ email: "racer@example.com", source: "elsewhere", token: "a-token-of-its-own" });

  const result = await pending;

  // Whoever lost the race is still told the truth: they are on the list.
  assert.equal(result.ok, true);
  assert.equal(result.state, "already");
  assert.equal(result.subscriber.email, "racer@example.com");

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(schema.newsletterSubscribers)
    .where(sql`lower(${schema.newsletterSubscribers.email}) = 'racer@example.com'`);
  assert.equal(count, 1);
});

test("a made-up token changes nothing and says so kindly", async () => {
  const res = await app.inject({ method: "GET", url: "/newsletter/unsubscribe?token=nonsense" });
  assert.equal(res.statusCode, 200);
  // It used to say the link had expired. These links have no expiry on them
  // anywhere, so that was never the reason, and it sent people looking for a
  // fault that was not there.
  assert.match(res.body, /could not find that subscription/i);
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

test("a test copy says so, rather than claiming the link expired", async () => {
  // A test goes to one address so a letter can be read in a real inbox
  // before anyone else gets it, and it carries a token belonging to nobody
  // so it can never take a real person off the list. Clicking it landed on
  // "that link has expired", which reads like a broken send on the one email
  // whose only job is checking that the send is not broken.
  const { TEST_TOKEN } = await import("../src/newsletter.js");

  const res = await app.inject({
    method: "GET",
    url: `/newsletter/unsubscribe?token=${encodeURIComponent(TEST_TOKEN)}`,
  });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /That was a test copy/);
  assert.ok(!res.body.includes("expired"), "nothing here has expired");
});

test("a link we do not know is not called expired, because none of them expire", async () => {
  // The token is a permanent lookup key with no expiry anywhere near it, so
  // the word was wrong in every case it was used.
  const res = await app.inject({
    method: "GET",
    url: "/newsletter/unsubscribe?token=not-a-token-we-ever-issued",
  });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /could not find that subscription/i);
  assert.ok(!res.body.includes("expired"));
});

test("the test token never takes a real person off the list", async () => {
  const { TEST_TOKEN } = await import("../src/newsletter.js");

  await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "leaver@vantaorigin.test" },
  });
  const joined = await rowFor("leaver@vantaorigin.test");
  assert.equal(joined.status, "subscribed");

  await app.inject({ method: "GET", url: `/newsletter/unsubscribe?token=${TEST_TOKEN}` });
  assert.equal(
    (await rowFor("leaver@vantaorigin.test")).status,
    "subscribed",
    "a test copy took a real person off the list"
  );

  // Their own link still does what it should.
  const left = await app.inject({
    method: "GET",
    url: `/newsletter/unsubscribe?token=${encodeURIComponent(joined.token)}`,
  });
  assert.match(left.body, /You have been unsubscribed/);
  assert.equal((await rowFor("leaver@vantaorigin.test")).status, "unsubscribed");
});
