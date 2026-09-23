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
