// A creator page shows a creator's published work to anyone, and nothing private.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-creator-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");

let app;

// An account cannot create anything until its address is confirmed. These
// suites are about what happens afterwards, so they mark the address
// confirmed outright rather than walking the code through the post; the
// journey itself is covered in verification.test.js.
const confirm = async (cookie) => {
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });
  return cookie;
};
let cookie;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();

  cookie = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "creator@vantaorigin.test", username: "emberforge", password: "supersecret1" },
    })
  );
  await confirm(cookie);

  await app.inject({
    method: "PATCH",
    url: "/me",
    headers: { cookie },
    payload: { firstName: "Ola", lastName: "Studio", bio: "Character creator from Lagos." },
  });

  const category = await app
    .inject({ method: "POST", url: "/categories", headers: { cookie }, payload: { name: "Comic" } })
    .then((res) => res.json());

  await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Ember Knight", categoryId: category.id, isPublic: true, tagline: "Heat made flesh" },
  });
  await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Work In Progress", categoryId: category.id, isPublic: false },
  });
  await app.inject({
    method: "POST",
    url: "/highlights",
    headers: { cookie },
    payload: { title: "First post", content: "Hello" },
  });
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a visitor sees the creator, their public characters and their posts", async () => {
  const res = await app.inject({ method: "GET", url: "/public/creators/emberforge" });
  assert.equal(res.statusCode, 200);

  const page = res.json();
  assert.equal(page.creator.username, "@emberforge");
  assert.equal(page.creator.name, "Ola Studio");
  assert.equal(page.creator.bio, "Character creator from Lagos.");
  assert.equal(page.characters.length, 1);
  assert.equal(page.characters[0].name, "Ember Knight");
  assert.equal(page.highlights.length, 1);
});

test("private characters stay out of it", async () => {
  const page = await app.inject({ method: "GET", url: "/public/creators/emberforge" }).then((r) => r.json());
  assert.ok(!page.characters.some((c) => c.name === "Work In Progress"));
});

test("the @ in a pasted link is ignored, and case does not matter", async () => {
  for (const handle of ["@emberforge", "EmberForge", "@EMBERFORGE"]) {
    const res = await app.inject({ method: "GET", url: `/public/creators/${handle}` });
    assert.equal(res.statusCode, 200, handle);
  }
});

test("an unknown page says so", async () => {
  const res = await app.inject({ method: "GET", url: "/public/creators/nobody" });
  assert.equal(res.statusCode, 404);
});

// The live bug: a handle typed with capitals was stored with them, while the
// lookup lowered only the link, so the creator own page said it did not
// exist.
test("a handle stored with capitals is still found", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: {
      email: "capitals@vantaorigin.test",
      username: "VtgShadowScribe",
      password: "supersecret1",
    },
  });

  for (const handle of ["VtgShadowScribe", "vtgshadowscribe", "@VTGSHADOWSCRIBE", "@vtgShadowscribe"]) {
    const res = await app.inject({ method: "GET", url: `/public/creators/${handle}` });
    assert.equal(res.statusCode, 200, handle);
    assert.equal(res.json().creator.username, "@VtgShadowScribe", handle);
  }
});

test("two people cannot hold the same name in different capitals", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: {
      email: "second@vantaorigin.test",
      username: "vtgshadowscribe",
      password: "supersecret1",
    },
  });

  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /taken/i);
});
