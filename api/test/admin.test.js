// The dashboard behind ADMIN_EMAILS: closed to everyone else, and truthful
// about what is on the site.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-admin-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test, second@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let boss;
let creator;
let fan;
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
  boss = await signUp("boss");
  creator = await signUp("maker");
  fan = await signUp("fan");

  const made = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: creator },
    payload: { name: "Switch Face", isPublic: true },
  });
  characterId = made.json().id;

  await app.inject({
    method: "POST",
    url: `/characters/${characterId}/like`,
    headers: { cookie: fan },
  });

  await app.inject({
    method: "POST",
    url: "/reports",
    headers: { cookie: fan },
    payload: { characterId, reason: "copyright", message: "Mine." },
  });
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("an ordinary creator cannot see the dashboard", async () => {
  for (const url of ["/admin/overview", "/admin/creators", "/admin/characters", "/admin/reports"]) {
    const res = await app.inject({ method: "GET", url, headers: { cookie: creator } });
    assert.equal(res.statusCode, 404, url);
  }
});

test("nor can a signed-out visitor", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/overview" });
  assert.equal(res.statusCode, 401);
});

test("the app can ask whether this account is an admin", async () => {
  const mine = await app.inject({ method: "GET", url: "/admin/me", headers: { cookie: boss } });
  assert.deepEqual(mine.json(), { admin: true });

  const theirs = await app.inject({ method: "GET", url: "/admin/me", headers: { cookie: creator } });
  assert.deepEqual(theirs.json(), { admin: false });

  const nobody = await app.inject({ method: "GET", url: "/admin/me" });
  assert.deepEqual(nobody.json(), { admin: false });
});

test("the overview counts what is really there", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/overview", headers: { cookie: boss } });
  assert.equal(res.statusCode, 200);

  const body = res.json();
  assert.equal(body.creators.total, 3);
  assert.equal(body.creators.thisWeek, 3);
  assert.equal(body.creators.verified, 0);
  assert.equal(body.characters.total, 1);
  assert.equal(body.characters.public, 1);
  assert.equal(body.likes, 1);
  assert.equal(body.openReports, 1);
});

test("creators are listed newest first, with their character count", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/creators", headers: { cookie: boss } });
  const rows = res.json();
  assert.equal(rows.length, 3);
  assert.equal(rows[0].username, "@fan"); // signed up last
  assert.equal(rows.find((row) => row.username === "@maker").characters, 1);
  assert.equal(rows[0].emailVerified, false);
});

test("characters are listed by how well liked they are", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/admin/characters",
    headers: { cookie: boss },
  });
  const rows = res.json();
  assert.equal(rows[0].name, "Switch Face");
  assert.equal(rows[0].likes, 1);
  assert.equal(rows[0].creator, "@maker");
});

test("reports arrive with both people named", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/reports", headers: { cookie: boss } });
  const [report] = res.json();
  assert.equal(report.reason, "copyright");
  assert.equal(report.message, "Mine.");
  assert.equal(report.status, "open");
  assert.equal(report.reporter.username, "@fan");
  assert.equal(report.subject.username, "@maker");
});

test("a report can be settled, and then leaves the open list", async () => {
  const open = await app.inject({ method: "GET", url: "/admin/reports", headers: { cookie: boss } });
  const id = open.json()[0].id;

  const settled = await app.inject({
    method: "PATCH",
    url: `/admin/reports/${id}`,
    headers: { cookie: boss },
    payload: { status: "reviewed" },
  });
  assert.equal(settled.statusCode, 200);

  const stillOpen = await app.inject({
    method: "GET",
    url: "/admin/reports",
    headers: { cookie: boss },
  });
  assert.equal(stillOpen.json().length, 0);

  const everything = await app.inject({
    method: "GET",
    url: "/admin/reports?status=all",
    headers: { cookie: boss },
  });
  assert.equal(everything.json().length, 1);
  assert.equal(everything.json()[0].status, "reviewed");

  const overview = await app.inject({
    method: "GET",
    url: "/admin/overview",
    headers: { cookie: boss },
  });
  assert.equal(overview.json().openReports, 0);
});

test("a creator cannot settle a report either", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: "/admin/reports/00000000-0000-0000-0000-000000000000",
    headers: { cookie: creator },
    payload: { status: "dismissed" },
  });
  assert.equal(res.statusCode, 404);
});
