// Carrying the old list across.
//
// This runs once, against the live database, over the people already on the
// newsletter. It cannot be tried again afterwards and it decides who may be
// written to, so it is tested by running the statement itself -- read from
// the migration file, not retyped here, because a copy would drift and the
// test would then be proving something nobody is going to run.
//
// A fresh test database has no legacy rows, so the migration passes over
// nothing when the suite sets up. The rows are made here, afterwards, and
// the statement is run again over them.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-consent-import-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { emailPreferences, newsletterSubscribers, users } = await import("../src/db/schema.js");

const CARRY_ACROSS = await readFile(
  new URL("../migrations/0024_migrate_newsletter_consent.sql", import.meta.url),
  "utf8"
);

// Somebody who already had an account before any of this existed.
const legacyAccount = async (email) => {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    email,
    username: email.split("@")[0],
    passwordHash: "x".repeat(60),
  });
  return id;
};

const onTheOldList = (email, status, extra = {}) =>
  db.insert(newsletterSubscribers).values({
    email,
    status,
    token: randomUUID(),
    source: "footer",
    ...extra,
  });

const preferencesOf = async (userId) => {
  const [row] = await db
    .select()
    .from(emailPreferences)
    .where(sql`${emailPreferences.userId} = ${userId}`);
  return row ?? null;
};

let yes;
let no;
let neverAsked;
let alreadyDecided;

before(async () => {
  await migrate();

  yes = await legacyAccount("onthelist@vantaorigin.test");
  await onTheOldList("onthelist@vantaorigin.test", "subscribed");

  no = await legacyAccount("left@vantaorigin.test");
  await onTheOldList("left@vantaorigin.test", "unsubscribed", {
    unsubscribedAt: new Date("2025-06-01T00:00:00Z"),
  });

  neverAsked = await legacyAccount("nobodyasked@vantaorigin.test");

  // Somebody who has already been through the new flow. Their answer must
  // survive the import untouched.
  alreadyDecided = await legacyAccount("decided@vantaorigin.test");
  await onTheOldList("decided@vantaorigin.test", "subscribed");
  await db.insert(emailPreferences).values({
    userId: alreadyDecided,
    marketingStatus: "subscribed",
    consentAt: new Date("2026-11-01T00:00:00Z"),
    consentSource: "double_opt_in",
    needsConsentReview: false,
  });

  await db.execute(sql.raw(CARRY_ACROSS));
});

after(async () => {
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("an inherited yes is carried across, and flagged as unprovable", async () => {
  const row = await preferencesOf(yes);

  assert.equal(row.marketingStatus, "subscribed");
  assert.equal(row.consentSource, "legacy_import");
  // The whole point of the flag: we know they were on the list and not how
  // they got there, and GDPR asks for the how.
  assert.equal(row.needsConsentReview, true);
  // A date that is the best available answer, not a claim about when they
  // agreed.
  assert.ok(row.consentAt);
});

test("somebody who had left stays left, and needs no review", async () => {
  const row = await preferencesOf(no);

  assert.equal(row.marketingStatus, "unsubscribed");
  // Leaving is an act, so it is the one piece of old consent we can be sure
  // of. Nothing to look into.
  assert.equal(row.needsConsentReview, false);
  assert.equal(row.unsubscribedAt?.toISOString().slice(0, 10), "2025-06-01");
});

test("an account nobody ever asked starts pending, not subscribed", async () => {
  const row = await preferencesOf(neverAsked);

  assert.equal(row.marketingStatus, "pending");
  assert.equal(row.consentSource, null);
  assert.equal(row.consentAt, null);
  assert.equal(row.needsConsentReview, false);
});

test("an answer already given is not overwritten by the import", async () => {
  const row = await preferencesOf(alreadyDecided);

  assert.equal(row.consentSource, "double_opt_in");
  assert.equal(row.needsConsentReview, false);
  assert.equal(row.consentAt.toISOString().slice(0, 10), "2026-11-01");
});

test("every account comes out with a row, so no send has to guess", async () => {
  const [accounts] = await db.select({ value: sql`count(*)::int` }).from(users);
  const [rows] = await db.select({ value: sql`count(*)::int` }).from(emailPreferences);

  assert.equal(Number(rows.value), Number(accounts.value));
  assert.ok(Number(accounts.value) >= 4);
});

test("running it twice changes nothing", async () => {
  const before = await preferencesOf(yes);
  await db.execute(sql.raw(CARRY_ACROSS));
  const after = await preferencesOf(yes);

  assert.deepEqual(after, before);
});
