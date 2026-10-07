// An account before its address is confirmed.
//
// It exists, it can be signed into and it can look around, but it cannot put
// anything into the world until somebody has answered the code we sent.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-verify-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let fresh;      // signed up, never confirmed
let confirmed;  // signed up and answered the code

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const signUp = async (name) => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: `${name}@vantaorigin.test`, username: name, password: "supersecret1" },
  });
  return { cookie: cookieFrom(res), code: res.json().devCode };
};

before(async () => {
  await migrate();
  app = await buildApp();

  const first = await signUp("unconfirmed");
  fresh = first.cookie;

  const second = await signUp("confirmed");
  confirmed = second.cookie;
  await app.inject({
    method: "POST",
    url: "/auth/verify-email",
    headers: { cookie: confirmed },
    payload: { code: second.code },
  });
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("an unconfirmed account cannot make a character", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: fresh },
    payload: { name: "Nobody" },
  });

  assert.equal(res.statusCode, 403);
  assert.match(res.json().error, /Confirm your email/i);
  // The screen needs to know why, so it can send them to the code.
  assert.equal(res.json().needsVerification, true);
});

test("nor a project, a post, a picture or a report", async () => {
  const attempts = [
    ["POST", "/categories", { name: "A project" }],
    ["POST", "/highlights", { title: "A post", content: "..." }],
    ["POST", "/reports", { subjectUserId: "00000000-0000-0000-0000-000000000000", reason: "spam" }],
  ];

  for (const [method, url, payload] of attempts) {
    const res = await app.inject({ method, url, headers: { cookie: fresh }, payload });
    assert.equal(res.statusCode, 403, `${method} ${url}`);
    assert.equal(res.json().needsVerification, true, `${method} ${url}`);
  }

  // Uploading needs a multipart body, so it is checked on its own.
  const upload = await app.inject({ method: "POST", url: "/uploads", headers: { cookie: fresh } });
  assert.equal(upload.statusCode, 403);
});

test("but it can still sign in, look around, and ask for the code again", async () => {
  for (const url of ["/auth/me", "/characters", "/categories", "/highlights"]) {
    const res = await app.inject({ method: "GET", url, headers: { cookie: fresh } });
    assert.equal(res.statusCode, 200, url);
  }

  const resend = await app.inject({
    method: "POST",
    url: "/auth/resend-code",
    headers: { cookie: fresh },
  });
  assert.ok([200, 429].includes(resend.statusCode), "the code can be asked for again");
});

test("answering the code opens everything up", async () => {
  const { cookie, code } = await signUp("latecomer");

  const before = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Too early" },
  });
  assert.equal(before.statusCode, 403);

  await app.inject({
    method: "POST",
    url: "/auth/verify-email",
    headers: { cookie },
    payload: { code },
  });

  const after = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Right on time" },
  });
  assert.equal(after.statusCode, 201);
  assert.equal(after.json().name, "Right on time");
});

test("a confirmed account was never stopped", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: confirmed },
    payload: { name: "Allowed" },
  });
  assert.equal(res.statusCode, 201);
});

test("somebody not signed in at all is told to sign in, not to confirm", async () => {
  const res = await app.inject({ method: "POST", url: "/characters", payload: { name: "Nobody" } });
  assert.equal(res.statusCode, 401);
  assert.match(res.json().error, /sign in/i);
});
