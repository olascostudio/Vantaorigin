// Reporting a creator: from a character or from a Realm handle, once per
// open complaint, never against yourself.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-reports-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");

let app;
let creator;
let reader;
let characterId;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const signUp = async (name) =>
  cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: `${name}@vantaorigin.test`, username: name, password: "supersecret1" },
    })
  );

before(async () => {
  await migrate();
  app = await buildApp();
  creator = await signUp("accused");
  reader = await signUp("witness");

  const res = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: creator },
    payload: { name: "Borrowed Art", isPublic: true },
  });
  characterId = res.json().id;
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a character page can report its creator", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: reader },
    payload: { characterId, reason: "copyright", message: "This is my drawing." },
  });

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json(), { ok: true, alreadyReported: false });

  const rows = await db.select().from(schema.reports);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reason, "copyright");
  assert.equal(rows[0].message, "This is my drawing.");
  assert.equal(rows[0].characterId, characterId);
  assert.equal(rows[0].status, "open");
});

test("reporting the same creator again does not stack up", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: reader },
    payload: { username: "@accused", reason: "spam" },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.json().alreadyReported, true);

  const rows = await db.select().from(schema.reports);
  assert.equal(rows.length, 1);
});

test("a Realm handle names the creator just as well", async () => {
  const other = await signUp("passerby");
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: other },
    payload: { username: "accused", reason: "harassment", message: "" },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.json().alreadyReported, false);
  assert.equal((await db.select().from(schema.reports)).length, 2);
});

test("you cannot report yourself", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: creator },
    payload: { characterId, reason: "spam" },
  });
  assert.equal(res.statusCode, 400);
});

test("a reason outside the list is refused", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: reader },
    payload: { characterId, reason: "because" },
  });
  assert.equal(res.statusCode, 400);
});

test("an unknown creator is not reportable", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: reader },
    payload: { username: "nobody-at-all", reason: "spam" },
  });
  assert.equal(res.statusCode, 404);
});

test("signing in is required", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/reports",
    payload: { characterId, reason: "spam" },
  });
  assert.equal(res.statusCode, 401);
});
