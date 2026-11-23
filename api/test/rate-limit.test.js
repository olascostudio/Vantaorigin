// The rate limits count the right person.
//
// They were keyed on request.ip, and trustProxy: true trusts every hop in
// X-Forwarded-For, so request.ip was the LEFTMOST entry: the one the client
// wrote. A different value per request meant a different bucket per request,
// and every limit in the app counted to one and started again. Forty sign-in
// attempts with a fresh header each time produced forty 401s and not one 429.
//
// So the limits existed and did nothing, which is worse than not having them,
// because it reads as protection. This asks the running app rather than the
// configuration: it sends more than the limit allows and insists on a 429.
//
// NODE_ENV is development here on purpose. The limits take themselves off
// under test, since the rest of the suite signs in over and over, so a test
// that ran as the others do would be testing nothing.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-ratelimit-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "development";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;

before(async () => {
  await migrate();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

const hammer = async (times, headers) => {
  const codes = {};
  for (let i = 0; i < times; i += 1) {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signin",
      headers,
      payload: { email: "nobody@vantaorigin.test", password: "not-the-password" },
    });
    codes[res.statusCode] = (codes[res.statusCode] ?? 0) + 1;
  }
  return codes;
};

test("guessing a password from one address runs out", async () => {
  const codes = await hammer(15, { "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
  assert.ok(codes["429"] > 0, `expected some 429s, saw ${JSON.stringify(codes)}`);
});

test("a fresh X-Forwarded-For on every request does not buy a fresh allowance", async () => {
  // The whole finding. Each request claims to come from somewhere new; the
  // rightmost entry, which our own proxy writes and a client cannot choose,
  // stays the same, so they all land in one bucket.
  const codes = {};
  for (let i = 0; i < 20; i += 1) {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signin",
      headers: { "x-forwarded-for": `198.51.100.${i}, 10.0.0.2` },
      payload: { email: "nobody@vantaorigin.test", password: "not-the-password" },
    });
    codes[res.statusCode] = (codes[res.statusCode] ?? 0) + 1;
  }

  assert.ok(
    codes["429"] > 0,
    `rotating the header bought unlimited attempts: ${JSON.stringify(codes)}`
  );
});

test("two genuinely different clients do not share one allowance", async () => {
  // The other half: the key has to separate people, or one busy creator
  // locks out everybody behind the same proxy.
  await hammer(12, { "x-forwarded-for": "198.51.100.200, 10.0.0.3" });
  const other = await hammer(1, { "x-forwarded-for": "198.51.100.201, 10.0.0.4" });
  assert.equal(other["429"], undefined, "a different client was refused on someone else's count");
});
