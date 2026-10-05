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

// Making an account is not the same as being able to use one: nothing can be
// created until the address has been confirmed. These helpers answer the code
// as a real person would, so each suite starts from a usable account.
const signUp = async (name) => {
  const made = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: `${name}@vantaorigin.test`, username: name, password: "supersecret1" },
  });
  const cookie = cookieFrom(made);
  const code = made.json().devCode;
  if (code) {
    await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      headers: { cookie },
      payload: { code },
    });
  }
  return cookie;
};

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
  // Every account here answers its code, because an account that has not
  // cannot create anything to count.
  assert.equal(body.creators.verified, 3);
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
  assert.equal(rows[0].emailVerified, true);
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

// The newsletter list, on the same terms as the rest of the dashboard.

test("the numbers include how many people are on the newsletter", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/overview", headers: { cookie: boss } });
  const numbers = res.json();

  // Three accounts were made in before(), and each one joined.
  assert.equal(numbers.newsletter.subscribed, 3);
  assert.equal(numbers.newsletter.thisWeek, 3);
});

test("the list is closed to an ordinary creator", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/newsletter", headers: { cookie: fan } });
  assert.equal(res.statusCode, 404);
});

test("the list says who is on it, where they came from, and who has an account", async () => {
  await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "reader-only@example.com" },
  });

  const res = await app.inject({ method: "GET", url: "/admin/newsletter", headers: { cookie: boss } });
  assert.equal(res.statusCode, 200);
  const { rows, counts, matching } = res.json();

  assert.equal(counts.subscribed, 4);
  assert.equal(counts.unsubscribed, 0);
  assert.equal(matching, 4);

  const reader = rows.find((row) => row.email === "reader-only@example.com");
  assert.equal(reader.source, "footer");
  assert.equal(reader.hasAccount, false);

  const withAccount = rows.find((row) => row.email === "boss@vantaorigin.test");
  assert.equal(withAccount.source, "signup");
  assert.equal(withAccount.hasAccount, true);

  // The unsubscribe token is somebody's key. It never leaves the server.
  assert.ok(rows.every((row) => !("token" in row)));
});

test("searching finds an address without listing everyone", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/admin/newsletter?q=READER-ONLY",
    headers: { cookie: boss },
  });

  const { rows, matching, counts } = res.json();
  assert.equal(matching, 1);
  assert.equal(rows[0].email, "reader-only@example.com");
  // The totals still describe the whole list, not the search.
  assert.equal(counts.subscribed, 4);
});

test("the list can be narrowed to who is still on it", async () => {
  const before = await app.inject({ method: "GET", url: "/admin/newsletter", headers: { cookie: boss } });
  const reader = before.json().rows.find((row) => row.email === "reader-only@example.com");

  const off = await app.inject({
    method: "PATCH",
    url: `/admin/newsletter/${reader.id}`,
    headers: { cookie: boss },
    payload: { status: "unsubscribed" },
  });
  assert.equal(off.statusCode, 200);

  const subscribed = await app.inject({
    method: "GET",
    url: "/admin/newsletter?status=subscribed",
    headers: { cookie: boss },
  });
  assert.equal(subscribed.json().matching, 3);

  const gone = await app.inject({
    method: "GET",
    url: "/admin/newsletter?status=unsubscribed",
    headers: { cookie: boss },
  });
  assert.equal(gone.json().matching, 1);
  assert.ok(gone.json().rows[0].unsubscribedAt);
});

test("a row can be erased outright, and then the address may join again", async () => {
  const list = await app.inject({ method: "GET", url: "/admin/newsletter", headers: { cookie: boss } });
  const reader = list.json().rows.find((row) => row.email === "reader-only@example.com");

  const res = await app.inject({
    method: "DELETE",
    url: `/admin/newsletter/${reader.id}`,
    headers: { cookie: boss },
  });
  assert.equal(res.statusCode, 200);

  const after = await app.inject({ method: "GET", url: "/admin/newsletter", headers: { cookie: boss } });
  assert.equal(after.json().counts.total, 3);

  // Nothing left behind, so joining again starts clean.
  await app.inject({
    method: "POST",
    url: "/newsletter/subscribe",
    payload: { email: "reader-only@example.com" },
  });
  const again = await app.inject({
    method: "GET",
    url: "/admin/newsletter?q=reader-only",
    headers: { cookie: boss },
  });
  assert.equal(again.json().rows[0].status, "subscribed");
  assert.notEqual(again.json().rows[0].id, reader.id);
});

test("the list downloads as a file of the people still on it", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/admin/newsletter.csv",
    headers: { cookie: boss },
  });

  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.match(res.headers["content-disposition"], /attachment; filename="vantaorigin-newsletter-\d{4}-\d{2}-\d{2}\.csv"/);

  const lines = res.body.trim().split("\n");
  assert.equal(lines[0], "email,status,source,joined");
  assert.equal(lines.length, 5); // heading plus four subscribed
  assert.ok(lines.every((line, index) => index === 0 || line.includes(",subscribed,")));
});

// How far people get, counted from what the site already holds.

test("the journey counts every step from joining to publishing", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/funnel", headers: { cookie: boss } });
  assert.equal(res.statusCode, 200);

  const { recent, allTime, days } = res.json();
  assert.equal(days, 30);

  // boss, maker, fan and anybody else these tests made.
  assert.ok(recent.joined >= 3);
  assert.equal(recent.joined, allTime.joined, "everybody here joined this month");

  // maker made a character and published it; the others did not.
  assert.equal(recent.made, 1);
  assert.equal(recent.published, 1);

  // All three confirmed, since nothing can be made before that.
  assert.equal(recent.verified, 3);

  // Each step is a subset of the one before it.
  assert.ok(recent.published <= recent.made);
  assert.ok(recent.made <= recent.joined);
});

test("the journey is closed to an ordinary creator", async () => {
  const res = await app.inject({ method: "GET", url: "/admin/funnel", headers: { cookie: fan } });
  assert.equal(res.statusCode, 404);
});

test("a shorter window counts fewer people, never more", async () => {
  const month = (
    await app.inject({ method: "GET", url: "/admin/funnel?days=30", headers: { cookie: boss } })
  ).json();
  const day = (
    await app.inject({ method: "GET", url: "/admin/funnel?days=1", headers: { cookie: boss } })
  ).json();

  assert.equal(day.days, 1);
  assert.ok(day.recent.joined <= month.recent.joined);
  assert.ok(month.recent.joined <= month.allTime.joined);
});
