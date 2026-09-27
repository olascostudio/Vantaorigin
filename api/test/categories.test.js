// Categories belong to the creator who made them: renaming one is theirs to
// do, and nobody else's.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-categories-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let mine;
let theirs;
let categoryId;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const signUp = async (name) =>
  cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: `${name}@vantaorigin.test`, username: name, password: "supersecret1" },
    })
  );

before(async () => {
  await migrate();
  app = await buildApp();
  mine = await signUp("owner");
  theirs = await signUp("stranger");

  const made = await app.inject({
    method: "POST",
    url: "/categories",
    headers: { cookie: mine },
    payload: { name: "Iron Inferno" },
  });
  categoryId = made.json().id;
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a category can be renamed", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/categories/${categoryId}`,
    headers: { cookie: mine },
    payload: { name: "  The Iron Inferno  " },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().name, "The Iron Inferno");

  const list = await app.inject({ method: "GET", url: "/categories", headers: { cookie: mine } });
  assert.equal(list.json()[0].name, "The Iron Inferno");
});

test("the characters filed under it stay where they are", async () => {
  const character = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: mine },
    payload: { name: "Obaalu", categoryId },
  });
  assert.equal(character.json().categoryId, categoryId);

  await app.inject({
    method: "PATCH",
    url: `/categories/${categoryId}`,
    headers: { cookie: mine },
    payload: { name: "Renamed again" },
  });

  const mineNow = await app.inject({ method: "GET", url: "/characters", headers: { cookie: mine } });
  assert.equal(mineNow.json()[0].categoryId, categoryId);
});

test("an empty name is refused", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/categories/${categoryId}`,
    headers: { cookie: mine },
    payload: { name: "" },
  });
  assert.equal(res.statusCode, 400);
});

test("somebody else cannot rename it", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/categories/${categoryId}`,
    headers: { cookie: theirs },
    payload: { name: "Mine now" },
  });
  assert.equal(res.statusCode, 404);

  const list = await app.inject({ method: "GET", url: "/categories", headers: { cookie: mine } });
  assert.equal(list.json()[0].name, "Renamed again");
});

test("signing in is required", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/categories/${categoryId}`,
    payload: { name: "Nobody" },
  });
  assert.equal(res.statusCode, 401);
});
