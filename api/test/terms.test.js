// Which terms are current, and who has accepted them.
//
// The terms page says what the terms are. It cannot say that any particular
// person read them, and when the wording changes that is the only question
// that matters: everybody who agreed to the old terms has not agreed to the
// new ones.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-terms-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { termsVersions, userTermsAcceptance } = await import("../src/db/schema.js");

let app;
let reader;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();

  const made = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "reader@vantaorigin.test", username: "reader", password: "supersecret1" },
  });
  reader = cookieFrom(made);
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(userTermsAcceptance);
  await db.delete(termsVersions);
});

const publish = (version, { effectiveDate = new Date(Date.now() - 1000), summary = "" } = {}) =>
  db.insert(termsVersions).values({ version, effectiveDate, summary });

const current = (cookie) =>
  app.inject({ method: "GET", url: "/terms/current", ...(cookie ? { headers: { cookie } } : {}) });

test("with no terms published, nobody is asked to accept anything", async () => {
  const res = await current(reader);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().version, null);
  assert.equal(res.json().mustAccept, false);
});

test("a signed-in reader who has not accepted is asked to", async () => {
  await publish("2026-11-12", { summary: "Clearer wording about who owns what." });

  const res = await current(reader);
  const body = res.json();
  assert.equal(body.version.version, "2026-11-12");
  assert.equal(body.version.summary, "Clearer wording about who owns what.");
  assert.equal(body.mustAccept, true);
  assert.equal(body.acceptedAt, null);
});

test("accepting stops the asking", async () => {
  await publish("2026-11-12");

  const said = await app.inject({
    method: "POST",
    url: "/terms/accept",
    headers: { cookie: reader },
    payload: { version: "2026-11-12" },
  });
  assert.equal(said.statusCode, 200);

  const after = await current(reader);
  assert.equal(after.json().mustAccept, false);
  assert.ok(after.json().acceptedAt, "should say when");
});

test("accepting twice is accepting once", async () => {
  // The banner can be open in two tabs, and both can be pressed.
  await publish("2026-11-12");

  for (let i = 0; i < 3; i += 1) {
    const res = await app.inject({
      method: "POST",
      url: "/terms/accept",
      headers: { cookie: reader },
      payload: { version: "2026-11-12" },
    });
    assert.equal(res.statusCode, 200);
  }

  const rows = await db.select().from(userTermsAcceptance);
  assert.equal(rows.length, 1);
});

test("a new version asks again, and the old acceptance is kept", async () => {
  await publish("2026-11-12");
  await app.inject({
    method: "POST",
    url: "/terms/accept",
    headers: { cookie: reader },
    payload: { version: "2026-11-12" },
  });

  await publish("2027-01-04", { summary: "A new section on commissions." });

  const res = await current(reader);
  assert.equal(res.json().version.version, "2027-01-04");
  assert.equal(res.json().mustAccept, true, "the new wording has not been agreed to");

  // And the history survives: accepting the new one does not erase that they
  // accepted the old one.
  await app.inject({
    method: "POST",
    url: "/terms/accept",
    headers: { cookie: reader },
    payload: { version: "2027-01-04" },
  });
  const rows = await db.select().from(userTermsAcceptance);
  assert.equal(rows.length, 2);
});

test("a version published with notice is not current until it applies", async () => {
  // A change can be announced before it takes effect, and until it takes
  // effect there is nothing to accept.
  await publish("2026-11-12");
  await publish("2099-01-01", { effectiveDate: new Date("2099-01-01") });

  const res = await current(reader);
  assert.equal(res.json().version.version, "2026-11-12", "the future one is not current yet");
});

test("a signed-out visitor is told the terms and asked for nothing", async () => {
  await publish("2026-11-12");

  const res = await current(null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().version.version, "2026-11-12");
  assert.equal(res.json().mustAccept, false, "there is nobody to accept");
});

test("accepting needs an account, and a version that exists", async () => {
  await publish("2026-11-12");

  const stranger = await app.inject({
    method: "POST",
    url: "/terms/accept",
    payload: { version: "2026-11-12" },
  });
  assert.equal(stranger.statusCode, 401);

  const nonsense = await app.inject({
    method: "POST",
    url: "/terms/accept",
    headers: { cookie: reader },
    payload: { version: "not-a-version" },
  });
  assert.equal(nonsense.statusCode, 404);
});
