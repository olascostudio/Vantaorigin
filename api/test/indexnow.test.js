// Handing a newly published character to the search engines that accept one.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SITE_URL = "https://www.vantaorigin.com";
process.env.INDEXNOW_KEY = "testkey123";
process.env.DATABASE_URL = "pglite://.pglite-indexnow-test";
process.env.NODE_ENV = "test";

const { pagesTouchedBy, tellSearchEngines, indexNowReady } = await import("../src/indexnow.js");

test("publishing one character touches three pages", () => {
  const urls = pagesTouchedBy({
    characterId: "abc-123",
    characterSlug: "urokojin",
    username: "@Vtgshadowscribe",
  });

  assert.deepEqual(urls, [
    "https://www.vantaorigin.com/discover",
    "https://www.vantaorigin.com/character/urokojin",
    "https://www.vantaorigin.com/creator/Vtgshadowscribe",
  ]);
});

test("it announces the address the page itself claims", () => {
  // It used to send the ?id= form, which is not what the sitemap offers and
  // not what the page calls canonical. A search engine following it lands on
  // a page pointing somewhere else and has to work out they are the same
  // thing, so the nudge was spent on the wrong address.
  const urls = pagesTouchedBy({ characterId: "abc-123", characterSlug: "urokojin" });

  assert.ok(urls.includes("https://www.vantaorigin.com/character/urokojin"));
  assert.ok(!urls.some((url) => url.includes("?id=")), "no query form should be sent");
});

test("a character made before slugs is still announced", () => {
  // The sitemap falls back to the id in the path, so this does too.
  const urls = pagesTouchedBy({ characterId: "abc-123" });

  assert.ok(urls.includes("https://www.vantaorigin.com/character/abc-123"));
});

test("the @ is not carried into the address", () => {
  const urls = pagesTouchedBy({ username: "@ollyson" });
  assert.ok(urls.includes("https://www.vantaorigin.com/creator/ollyson"));
  assert.ok(!urls.some((url) => url.includes("@")));
});

test("what is sent names the host, the key and where the key lives", async () => {
  let sent;
  const ok = await tellSearchEngines(
    null,
    { characterId: "abc-123", username: "@ollyson" },
    {
      fetchImpl: async (url, options) => {
        sent = { url, body: JSON.parse(options.body) };
        return { ok: true, status: 200 };
      },
    }
  );

  assert.equal(ok, true);
  assert.equal(sent.url, "https://api.indexnow.org/indexnow");
  assert.equal(sent.body.host, "www.vantaorigin.com");
  assert.equal(sent.body.key, "testkey123");
  assert.equal(sent.body.keyLocation, "https://www.vantaorigin.com/testkey123.txt");
  assert.equal(sent.body.urlList.length, 3);
});

test("a refusal is noted, not thrown", async () => {
  const ok = await tellSearchEngines(
    null,
    { characterId: "abc" },
    { fetchImpl: async () => ({ ok: false, status: 403 }) }
  );
  assert.equal(ok, false);
});

test("an unreachable search engine is shrugged off", async () => {
  const ok = await tellSearchEngines(
    null,
    { characterId: "abc" },
    {
      fetchImpl: async () => {
        throw new Error("network down");
      },
    }
  );
  assert.equal(ok, false);
});

test("202 counts as accepted, since the key is still being checked", async () => {
  const ok = await tellSearchEngines(
    null,
    { characterId: "abc" },
    { fetchImpl: async () => ({ ok: false, status: 202 }) }
  );
  assert.equal(ok, true);
});

test("it knows whether it is set up", () => {
  assert.equal(indexNowReady(), true);
});
