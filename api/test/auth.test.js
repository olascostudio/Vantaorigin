// The whole sign-up, verify, sign-in and reset flow against a real Postgres
// (PGlite: the same engine compiled to WebAssembly, so no container needed).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-auth-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
// The code sign-up sent: asking for another one straight away is refused.
let signUpCode;
const account = { email: "creator@vantaorigin.test", password: "supersecret1", username: "creator" };

before(async () => {
  await migrate();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

test("sign up creates an account and signs the creator in", async () => {
  const res = await app.inject({ method: "POST", url: "/auth/signup", payload: account });
  assert.equal(res.statusCode, 201);

  const body = res.json();
  assert.equal(body.user.email, account.email);
  assert.equal(body.user.username, "@creator");
  assert.equal(body.user.emailVerified, false);
  assert.match(body.devCode, /^\d{4}$/);
  signUpCode = body.devCode;

  const me = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: cookieFrom(res) },
  });
  assert.equal(me.json().user.email, account.email);
});

test("the same email cannot be used twice", async () => {
  const res = await app.inject({ method: "POST", url: "/auth/signup", payload: account });
  assert.equal(res.statusCode, 409);
});

test("a wrong code is refused and the right one verifies the email", async () => {
  const signIn = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: account.email, password: account.password },
  });
  const cookie = cookieFrom(signIn);

  // Another code cannot be had yet, so the one from sign-up is the live one.
  const tooSoon = await app.inject({
    method: "POST",
    url: "/auth/resend-code",
    headers: { cookie },
  });
  assert.equal(tooSoon.statusCode, 429);
  assert.ok(tooSoon.json().retryAfter > 0);

  const code = signUpCode;

  const wrong = await app.inject({
    method: "POST",
    url: "/auth/verify-email",
    headers: { cookie },
    payload: { code: code === "0000" ? "1111" : "0000" },
  });
  assert.equal(wrong.statusCode, 400);

  const right = await app.inject({
    method: "POST",
    url: "/auth/verify-email",
    headers: { cookie },
    payload: { code },
  });
  assert.equal(right.statusCode, 200);

  const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie } });
  assert.equal(me.json().user.emailVerified, true);
});

test("a wrong password is refused", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: account.email, password: "not-the-password" },
  });
  assert.equal(res.statusCode, 401);
  assert.match(res.json().error, /incorrect/i);
});

test("signing out ends the session", async () => {
  const signIn = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: account.email, password: account.password },
  });
  const cookie = cookieFrom(signIn);

  await app.inject({ method: "POST", url: "/auth/signout", headers: { cookie } });

  const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie } });
  assert.equal(me.json().user, null);
});

test("a forgotten password can be reset with the emailed code", async () => {
  const forgot = await app.inject({
    method: "POST",
    url: "/auth/forgot-password",
    payload: { email: account.email },
  });
  const code = forgot.json().devCode;

  const check = await app.inject({
    method: "POST",
    url: "/auth/check-reset-code",
    payload: { email: account.email, code },
  });
  assert.equal(check.statusCode, 200);

  const reset = await app.inject({
    method: "POST",
    url: "/auth/reset-password",
    payload: { email: account.email, code, password: "brand-new-pass" },
  });
  assert.equal(reset.statusCode, 200);

  const oldPassword = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: account.email, password: account.password },
  });
  assert.equal(oldPassword.statusCode, 401);

  const newPassword = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: account.email, password: "brand-new-pass" },
  });
  assert.equal(newPassword.statusCode, 200);
});

test("an unknown email still answers ok, so accounts stay private", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/forgot-password",
    payload: { email: "nobody@vantaorigin.test" },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().devCode, undefined);
});
