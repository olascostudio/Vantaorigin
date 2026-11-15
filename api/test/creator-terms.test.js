// The rules a creator agrees to before they see anybody's address.
//
// The privacy policy has listed these all along. What was missing was any
// record that a particular creator had been told, which is the only part
// that would matter if one of them sold a list. So these test that the
// gate is on the data and not on the screen, and that agreeing leaves a
// record naming the version and the moment.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

const dataDir = ".pglite-creator-terms-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { creatorSubscriptions, termsVersions, userTermsAcceptance, users } = await import(
  "../src/db/schema.js"
);

let app;
let maker = "";
let makerId = "";

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const get = (url) => app.inject({ method: "GET", url, headers: { cookie: maker } });
const accept = (version) =>
  app.inject({
    method: "POST",
    url: "/me/creator/terms/accept",
    headers: { cookie: maker },
    payload: { version },
  });

const currentVersion = async () => (await get("/me/creator/terms")).json().version;

before(async () => {
  await migrate();
  app = await buildApp();

  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "maker@vantaorigin.test", username: "maker", password: "supersecret1" },
  });
  maker = cookieFrom(res);
  await db.update(users).set({ emailVerifiedAt: new Date() });
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(email) = 'maker@vantaorigin.test'`);
  makerId = row.id;

  // Somebody to be hidden.
  const [fan] = await db
    .insert(users)
    .values({ email: "fan@readers.test", username: "fan", passwordHash: "x".repeat(60) })
    .returning({ id: users.id });
  await db.insert(creatorSubscriptions).values({
    creatorId: makerId,
    subscriberId: fan.id,
    token: randomUUID(),
  });
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(userTermsAcceptance);
});

test("the migration seeds a version, so the gate is not inert on arrival", async () => {
  const body = (await get("/me/creator/terms")).json();

  // A column with no row in it would wave everybody through while looking
  // like it was doing something.
  assert.equal(body.required, true);
  assert.equal(body.accepted, false);
  assert.ok(body.version);
  assert.match(body.summary, /never sell, rent or pass on a subscriber list/i);
});

test("nothing that names a subscriber is served before agreeing", async () => {
  for (const url of [
    "/me/creator/subscribers",
    "/me/creator/subscribers.csv",
    "/me/creator/activity",
  ]) {
    const res = await get(url);
    assert.equal(res.statusCode, 403, url);
    assert.equal(res.json().needsCreatorTerms, true, url);
    // Said with the version, so the screen can show the right one.
    assert.ok(res.json().version, url);
    assert.doesNotMatch(res.body, /fan@readers\.test/, `${url} must not leak the address`);
  }
});

test("the counts are still shown, because they name nobody", async () => {
  const res = await get("/me/creator/overview");

  // Seeing that there are people is what makes the agreement worth
  // reading. It tells a creator what they have without telling them who
  // anybody is.
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().total, 1);
});

test("agreeing opens it, and the record says which version and when", async () => {
  const version = await currentVersion();
  const res = await accept(version);
  assert.equal(res.statusCode, 200);

  const [row] = await db
    .select()
    .from(userTermsAcceptance)
    .where(eq(userTermsAcceptance.userId, makerId));
  assert.equal(row.version, version);
  assert.ok(row.acceptedAt);

  const list = await get("/me/creator/subscribers");
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().subscribers[0].email, "fan@readers.test");

  const file = await get("/me/creator/subscribers.csv");
  assert.equal(file.statusCode, 200);
  assert.match(file.body, /fan@readers\.test/);
});

test("agreeing twice is agreeing once", async () => {
  const version = await currentVersion();
  await accept(version);
  await accept(version);

  const rows = await db
    .select()
    .from(userTermsAcceptance)
    .where(eq(userTermsAcceptance.userId, makerId));
  assert.equal(rows.length, 1);
});

test("the version has to be named, so nobody agrees to a document that moved", async () => {
  const res = await accept("creator-1999-01-01");

  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /changed since this page opened/i);
  assert.equal(
    (await db.select().from(userTermsAcceptance).where(eq(userTermsAcceptance.userId, makerId))).length,
    0
  );
});

test("a new version closes it again", async () => {
  await accept(await currentVersion());
  assert.equal((await get("/me/creator/subscribers")).statusCode, 200);

  // The rules change. Having agreed to the old ones is not agreeing to
  // these, and the old acceptance is kept rather than overwritten.
  await db.insert(termsVersions).values({
    version: "creator-2027-01-01",
    kind: "creator_terms",
    effectiveDate: new Date("2027-01-01T00:00:00Z"),
    summary: "Something new",
    url: "/privacy",
  });

  const res = await get("/me/creator/subscribers");
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().version, "creator-2027-01-01");

  await accept("creator-2027-01-01");
  assert.equal((await get("/me/creator/subscribers")).statusCode, 200);

  const rows = await db
    .select()
    .from(userTermsAcceptance)
    .where(eq(userTermsAcceptance.userId, makerId));
  // Both, because a later version does not erase that they accepted the
  // earlier one, and the earlier one is what governed what they did then.
  assert.equal(rows.length, 2);

  await db.delete(termsVersions).where(eq(termsVersions.version, "creator-2027-01-01"));
});

test("the ordinary terms and the creator terms are different agreements", async () => {
  await db.insert(termsVersions).values({
    version: "site-2026-11-15",
    kind: "terms",
    effectiveDate: new Date(),
    summary: "The ordinary terms",
    url: "/terms",
  });

  // Accepting the site terms must not open the subscriber list: they say
  // nothing about what a creator may do with somebody else's address.
  await db.insert(userTermsAcceptance).values({ userId: makerId, version: "site-2026-11-15" });

  assert.equal((await get("/me/creator/subscribers")).statusCode, 403);

  await db.delete(termsVersions).where(eq(termsVersions.version, "site-2026-11-15"));
});

test("a visitor with no account is refused before any of this is considered", async () => {
  const res = await app.inject({ method: "GET", url: "/me/creator/subscribers" });
  assert.equal(res.statusCode, 401);
});
