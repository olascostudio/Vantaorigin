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
