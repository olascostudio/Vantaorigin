// A Realm shows a creator's published work to anyone, and nothing private.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-realm-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
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
      payload: { email: "realm@vantaorigin.test", username: "emberforge", password: "supersecret1" },
    })
  );

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
  const res = await app.inject({ method: "GET", url: "/public/realms/emberforge" });
  assert.equal(res.statusCode, 200);

  const realm = res.json();
  assert.equal(realm.creator.username, "@emberforge");
  assert.equal(realm.creator.name, "Ola Studio");
  assert.equal(realm.creator.bio, "Character creator from Lagos.");
  assert.equal(realm.characters.length, 1);
  assert.equal(realm.characters[0].name, "Ember Knight");
  assert.equal(realm.highlights.length, 1);
});

test("private characters stay out of it", async () => {
  const realm = await app.inject({ method: "GET", url: "/public/realms/emberforge" }).then((r) => r.json());
  assert.ok(!realm.characters.some((c) => c.name === "Work In Progress"));
});

test("the @ in a pasted link is ignored, and case does not matter", async () => {
  for (const handle of ["@emberforge", "EmberForge", "@EMBERFORGE"]) {
    const res = await app.inject({ method: "GET", url: `/public/realms/${handle}` });
    assert.equal(res.statusCode, 200, handle);
  }
});

test("an unknown Realm says so", async () => {
  const res = await app.inject({ method: "GET", url: "/public/realms/nobody" });
  assert.equal(res.statusCode, 404);
});
