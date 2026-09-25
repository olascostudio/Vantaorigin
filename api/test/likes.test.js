// Likes on a character: one per person, taken back the same way, and never
// on your own work.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-likes-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let creator;
let reader;
let otherReader;
let characterId;

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
  creator = await signUp("maker");
  reader = await signUp("reader");
  otherReader = await signUp("reader2");

  const res = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: creator },
    payload: { name: "Switch Face", isPublic: true },
  });
  characterId = res.json().id;
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a new character starts with no likes", async () => {
  const res = await app.inject({ method: "GET", url: `/public/characters/${characterId}` });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().likes, 0);
  assert.equal(res.json().liked, false);
});

test("a signed-in visitor can like a character", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/characters/${characterId}/like`,
    headers: { cookie: reader },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { likes: 1, liked: true });
});

test("liking twice still counts once", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/characters/${characterId}/like`,
    headers: { cookie: reader },
  });
  assert.deepEqual(res.json(), { likes: 1, liked: true });
});

test("the count adds up across people", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/characters/${characterId}/like`,
    headers: { cookie: otherReader },
  });
  assert.deepEqual(res.json(), { likes: 2, liked: true });
});

test("the character reads back its count, and who liked it", async () => {
  const mine = await app.inject({
    method: "GET",
    url: `/public/characters/${characterId}`,
    headers: { cookie: reader },
  });
  assert.equal(mine.json().likes, 2);
  assert.equal(mine.json().liked, true);

  // Signed out: the count is the same, the sword is not pressed.
  const signedOut = await app.inject({ method: "GET", url: `/public/characters/${characterId}` });
  assert.equal(signedOut.json().likes, 2);
  assert.equal(signedOut.json().liked, false);
});

test("a like can be taken back", async () => {
  const res = await app.inject({
    method: "DELETE",
    url: `/characters/${characterId}/like`,
    headers: { cookie: reader },
  });
  assert.deepEqual(res.json(), { likes: 1, liked: false });
});

test("you cannot like your own character", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/characters/${characterId}/like`,
    headers: { cookie: creator },
  });
  assert.equal(res.statusCode, 400);
});

test("signing in is required", async () => {
  const res = await app.inject({ method: "POST", url: `/characters/${characterId}/like` });
  assert.equal(res.statusCode, 401);
});

test("a private character cannot be liked", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: creator },
    payload: { name: "Kept back", isPublic: false },
  });

  const res = await app.inject({
    method: "POST",
    url: `/characters/${made.json().id}/like`,
    headers: { cookie: reader },
  });
  assert.equal(res.statusCode, 404);
});

test("the creator sees the count on their own library", async () => {
  const res = await app.inject({ method: "GET", url: "/characters", headers: { cookie: creator } });
  const mine = res.json().find((row) => row.id === characterId);
  assert.equal(mine.likes, 1);
});
