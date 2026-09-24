// Deleting an account must actually delete it — and must not be possible
// without the password, since a borrowed session should not be enough.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-account-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
const account = { email: "leaver@vantaorigin.test", username: "leaver", password: "supersecret1" };

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("the wrong password does not delete the account", async () => {
  const signUp = await app.inject({ method: "POST", url: "/auth/signup", payload: account });
  const cookie = cookieFrom(signUp);

  const res = await app.inject({
    method: "DELETE",
    url: "/me",
    headers: { cookie },
    payload: { password: "not-my-password" },
  });
  assert.equal(res.statusCode, 400);

  const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie } });
  assert.equal(me.json().user.email, account.email);
});

test("deleting takes the creator's characters and posts with it", async () => {
  const signIn = await app.inject({
    method: "POST",
    url: "/auth/signin",
    payload: { email: account.email, password: account.password },
  });
  const cookie = cookieFrom(signIn);

  const category = await app
    .inject({ method: "POST", url: "/categories", headers: { cookie }, payload: { name: "Work" } })
    .then((res) => res.json());

  await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Ember", categoryId: category.id, isPublic: true },
  });
  await app.inject({
    method: "POST",
    url: "/highlights",
    headers: { cookie },
    payload: { title: "Hello", content: "First post" },
  });

  const before = await app.inject({ method: "GET", url: "/public/characters" });
  assert.equal(before.json().length, 1);

  const gone = await app.inject({
    method: "DELETE",
    url: "/me",
    headers: { cookie },
    payload: { password: account.password },
  });
  assert.equal(gone.statusCode, 200);

  // the session no longer belongs to anyone
  const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie } });
  assert.equal(me.json().user, null);

  // and the published work is gone from the public feeds
  const characters = await app.inject({ method: "GET", url: "/public/characters" });
  assert.equal(characters.json().length, 0);

  const highlights = await app.inject({ method: "GET", url: "/public/highlights" });
  assert.equal(highlights.json().length, 0);
});

test("the email can be used again afterwards", async () => {
  const res = await app.inject({ method: "POST", url: "/auth/signup", payload: account });
  assert.equal(res.statusCode, 201);
});
