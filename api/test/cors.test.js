// The front end and the API live on different domains in production, so the
// browser only sends the session cookie if CORS names that exact origin.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-cors-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = "https://vantaorigin.vercel.app";
process.env.ALLOWED_ORIGIN_SUFFIXES = ".vercel.app";
process.env.ALLOWED_ORIGIN_PREFIXES = "vantaorigin";

const { buildApp } = await import("../src/app.js");
const { endConnection } = await import("../src/db/client.js");

let app;
before(async () => {
  app = await buildApp();
});
after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

const originHeader = async (origin) => {
  const res = await app.inject({ method: "GET", url: "/auth/me", headers: { origin } });
  return res.headers["access-control-allow-origin"];
};

test("the live front end is allowed, with credentials", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { origin: "https://vantaorigin.vercel.app" },
  });
  assert.equal(res.headers["access-control-allow-origin"], "https://vantaorigin.vercel.app");
  assert.equal(res.headers["access-control-allow-credentials"], "true");
});

test("preview deployments are allowed", async () => {
  assert.equal(
    await originHeader("https://vantaorigin-git-branch.vercel.app"),
    "https://vantaorigin-git-branch.vercel.app"
  );
});

test("anywhere else is refused", async () => {
  assert.equal(await originHeader("https://not-ours.example.com"), undefined);
});

// A public suffix is not an identity.
//
// ".vercel.app" was once the whole rule, and anybody can put a site on one
// for free. Every such site was being told Access-Control-Allow-Credentials:
// true, and because the API and the app sit on different domains the session
// cookie is SameSite=None and travels with the request. A page nobody here
// has ever seen could therefore ask this API for a signed-in person's data
// and read the answer. These are the cases that said yes.
test("a stranger's site on the same public suffix is refused", async () => {
  for (const origin of [
    "https://totally-unrelated-attacker.vercel.app",
    "https://i-registered-this-today.vercel.app",
    "https://phishing.vercel.app",
  ]) {
    assert.equal(await originHeader(origin), undefined, origin);
  }
});

test("the suffix still has to be a suffix", async () => {
  // Matching without the leading dot would have let this one through.
  assert.equal(await originHeader("https://evilvercel.app"), undefined);
});

test("an origin that will not parse is refused rather than thrown on", async () => {
  assert.equal(await originHeader("not a url"), undefined);
});

// A prefix is not a boundary.
//
// Matching the prefix against the raw characters of the hostname let three
// shapes through that are not ours: a longer word that merely starts the same
// way, a label of somebody else's slipped in between, and any scheme at all
// since only the hostname was being read.
test("a longer name that merely starts the same way is refused", async () => {
  assert.equal(await originHeader("https://vantaoriginal.vercel.app"), undefined);
  assert.equal(await originHeader("https://vantaoriginxyz.vercel.app"), undefined);
});

test("somebody else's label in front of the suffix is refused", async () => {
  assert.equal(await originHeader("https://vantaorigin.evil.vercel.app"), undefined);
  assert.equal(await originHeader("https://vantaorigin-x.vercel.app.evil.com"), undefined);
});

test("a preview origin has to be https", async () => {
  for (const origin of [
    "http://vantaorigin-x.vercel.app",
    "ftp://vantaorigin-x.vercel.app",
    "moz-extension://vantaorigin-x.vercel.app",
  ]) {
    assert.equal(await originHeader(origin), undefined, origin);
  }
});

test("what is checked and what is echoed back are the same string", async () => {
  // These parse to a hostname we would trust while the header carries
  // something else, and the header is reflected as the bytes that arrived.
  // The fullwidth one used to reach the header write and throw a 500.
  for (const origin of [
    "  https://vantaorigin-x.vercel.app  ",
    "\thttps://vantaorigin-x.vercel.app",
    "https://attacker.com@vantaorigin-x.vercel.app",
    "https://ｖantaorigin-x.vercel.app",
  ]) {
    const res = await app.inject({ method: "GET", url: "/auth/me", headers: { origin } });
    assert.notEqual(res.statusCode, 500, `${JSON.stringify(origin)} should not crash`);
    assert.equal(res.headers["access-control-allow-origin"], undefined, JSON.stringify(origin));
  }
});

test("a real preview deployment still works", async () => {
  // The point of the prefix is to keep these, not to lock everything out.
  for (const origin of [
    "https://vantaorigin.vercel.app",
    "https://vantaorigin-git-main-olascostudio.vercel.app",
    "https://vantaorigin-abc123-olascostudio.vercel.app",
  ]) {
    assert.equal(await originHeader(origin), origin, origin);
  }
});
