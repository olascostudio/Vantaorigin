// A character card on somebody else's site.
//
// Two things are being checked here, and the second matters more than the
// first. That the card works where it is meant to, and that nothing else on
// this API can be dropped into a frame on a page the creator has never seen.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-embed-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let maker;
let publicSlug;
let privateId;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

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
  maker = await signUp("maker");

  const category = await app.inject({
    method: "POST",
    url: "/categories",
    headers: { cookie: maker },
    payload: { name: "My Characters" },
  });
  const categoryId = category.json().id;

  const shown = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: maker },
    payload: {
      name: "Urokojin",
      categoryId,
      universe: "The Vantaverse",
      tagline: "The Thunder Judge",
      isPublic: true,
    },
  });
  publicSlug = shown.json().slug || shown.json().id;

  const hidden = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: maker },
    payload: { name: "Not ready", categoryId, isPublic: false },
  });
  privateId = hidden.json().id;
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a published character comes back as a card anyone can frame", async () => {
  const res = await app.inject({ method: "GET", url: `/embed/character/${publicSlug}` });

  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/html/);
  assert.equal(res.headers["content-security-policy"], "frame-ancestors *");

  const html = res.body;
  assert.match(html, /Urokojin/);
  assert.match(html, /The Thunder Judge/);
  assert.match(html, /The Vantaverse/);
  assert.match(html, /@maker/);
  // It opens the real page when somebody clicks it.
  assert.match(html, /href="[^"]*\/character\/[^"]*"/);
  // And it is a page, not an application: nothing here runs.
  assert.ok(!html.includes("<script"), "an embed should carry no script");
});

test("it stays small enough to put on somebody else's page", async () => {
  const res = await app.inject({ method: "GET", url: `/embed/character/${publicSlug}` });
  // The app bundle is most of a megabyte. This is the whole point of not
  // serving the app here.
  assert.ok(res.body.length < 8000, `embed was ${res.body.length} bytes`);
});

test("a character nobody published cannot be embedded", async () => {
  const res = await app.inject({ method: "GET", url: `/embed/character/${privateId}` });
  assert.equal(res.statusCode, 404);
  assert.ok(!res.body.includes("Not ready"), "a private character's name must not leak");
});

test("a character that does not exist answers the same way", async () => {
  const missing = await app.inject({ method: "GET", url: "/embed/character/nobody-at-all" });
  const hidden = await app.inject({ method: "GET", url: `/embed/character/${privateId}` });

  // The same answer either way, so an embed cannot be used to find out
  // whether a private character exists.
  assert.equal(missing.statusCode, hidden.statusCode);
  assert.equal(missing.body, hidden.body);
});

test("a creator who turns embedding off is respected", async () => {
  await app.inject({
    method: "PATCH",
    url: "/me",
    headers: { cookie: maker },
    payload: { allowEmbeds: false },
  });

  const res = await app.inject({ method: "GET", url: `/embed/character/${publicSlug}` });
  assert.equal(res.statusCode, 403);
  assert.ok(!res.body.includes("Thunder Judge"));

  // The character itself is still public: this is about where it may appear,
  // not about whether it can be read.
  const page = await app.inject({ method: "GET", url: `/preview/character/${publicSlug}` });
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Urokojin/);

  await app.inject({
    method: "PATCH",
    url: "/me",
    headers: { cookie: maker },
    payload: { allowEmbeds: true },
  });
});

test("nothing else on the API may be framed", async () => {
  const elsewhere = [
    "/health",
    `/preview/character/${publicSlug}`,
    "/blog",
    "/sitemap.xml",
  ];

  for (const url of elsewhere) {
    const res = await app.inject({ method: "GET", url });
    assert.equal(
      res.headers["content-security-policy"],
      "frame-ancestors 'none'",
      `${url} should refuse to be framed`
    );
    assert.equal(res.headers["x-frame-options"], "DENY", `${url} should refuse to be framed`);
  }
});

test("the embed is the one exception, and says so", async () => {
  const res = await app.inject({ method: "GET", url: `/embed/character/${publicSlug}` });
  assert.equal(res.headers["content-security-policy"], "frame-ancestors *");
  assert.notEqual(res.headers["x-frame-options"], "DENY");
});
