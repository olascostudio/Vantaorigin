// Highlight posts belong to the creator who wrote them: nobody else can edit
// or delete them, and the public feed shows everyone's.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-highlights-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let ola;
let someoneElse;

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
  ola = await signUp("ola");
  someoneElse = await signUp("stranger");
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

let postId;

test("a creator can post a highlight", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/highlights",
    headers: { cookie: ola },
    payload: {
      title: "A New Challenger Approaches",
      content: "SwitchFace has entered the arena.",
      images: ["https://example.com/one.png", "https://example.com/two.png"],
    },
  });

  assert.equal(res.statusCode, 201);
  const post = res.json();
  assert.equal(post.title, "A New Challenger Approaches");
  assert.equal(post.images.length, 2);
  assert.equal(post.author.username, "@ola");
  postId = post.id;
});

test("their feed lists it", async () => {
  const res = await app.inject({ method: "GET", url: "/highlights", headers: { cookie: ola } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().length, 1);
});

test("someone else's feed does not", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/highlights",
    headers: { cookie: someoneElse },
  });
  assert.equal(res.json().length, 0);
});

test("the author can edit it", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/highlights/${postId}`,
    headers: { cookie: ola },
    payload: { title: "Edited title" },
  });
  assert.equal(res.json().title, "Edited title");
});

test("a stranger cannot edit it", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/highlights/${postId}`,
    headers: { cookie: someoneElse },
    payload: { title: "Hijacked" },
  });
  assert.equal(res.statusCode, 404);
});

test("a stranger cannot delete it", async () => {
  await app.inject({
    method: "DELETE",
    url: `/highlights/${postId}`,
    headers: { cookie: someoneElse },
  });
  const res = await app.inject({ method: "GET", url: "/highlights", headers: { cookie: ola } });
  assert.equal(res.json().length, 1);
});

test("the public feed shows posts without signing in", async () => {
  const res = await app.inject({ method: "GET", url: "/public/highlights" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json()[0].author.username, "@ola");
});

test("the author can delete it", async () => {
  const res = await app.inject({
    method: "DELETE",
    url: `/highlights/${postId}`,
    headers: { cookie: ola },
  });
  assert.equal(res.statusCode, 204);

  const feed = await app.inject({ method: "GET", url: "/highlights", headers: { cookie: ola } });
  assert.equal(feed.json().length, 0);
});

test("signed-out visitors cannot post", async () => {
  const res = await app.inject({ method: "POST", url: "/highlights", payload: { title: "no" } });
  assert.equal(res.statusCode, 401);
});
