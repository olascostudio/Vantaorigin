// Checks the app builds and behaves without a database: bad input is rejected,
// signed-out requests are refused, and unknown routes 404. Full end-to-end
// tests run against the Postgres container.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://vanta:vanta@localhost:5432/vantaorigin";
process.env.NODE_ENV = "test";

const { buildApp } = await import("../src/app.js");
const { sql } = await import("../src/db/client.js");

let app;
before(async () => {
  app = await buildApp();
});
after(async () => {
  await app.close();
  await sql.end({ timeout: 1 });
});

test("rejects a password that is too short", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "a@b.com", password: "short", username: "someone" },
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /at least 8/);
});

test("rejects an invalid email", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: "not-an-email", password: "longenough" },
  });
  assert.equal(res.statusCode, 400);
});

test("signed-out visitors cannot list characters", async () => {
  const res = await app.inject({ method: "GET", url: "/characters" });
  assert.equal(res.statusCode, 401);
});

test("signed-out visitors cannot upload", async () => {
  const res = await app.inject({ method: "POST", url: "/uploads" });
  assert.equal(res.statusCode, 401);
});

test("me returns null when signed out", async () => {
  const res = await app.inject({ method: "GET", url: "/auth/me" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().user, null);
});

test("unknown routes 404", async () => {
  const res = await app.inject({ method: "GET", url: "/nope" });
  assert.equal(res.statusCode, 404);
});
