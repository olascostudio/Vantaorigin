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

// ---- the browse page ----
// These run last on purpose: by now the file has signed up accounts that
// never published anything, which is exactly what the listing has to leave
// out.
test("the listing has everybody who has published, and their work", async () => {
  const res = await app.inject({ method: "GET", url: "/public/creators" });
  assert.equal(res.statusCode, 200);

  const rows = res.json();
  const ember = rows.find((row) => row.username === "@emberforge");
  assert.ok(ember, "the creator who published is listed");
  assert.equal(ember.name, "Ola Studio");
  assert.equal(ember.bio, "Character creator from Lagos.");
  // One published, one private: the count is of what is actually public.
  assert.equal(ember.published, 1);
  assert.deepEqual(
    ember.characters.map((character) => character.alias),
    ["Ember Knight"]
  );
});

test("an account with nothing published is not listed", async () => {
  const rows = await app.inject({ method: "GET", url: "/public/creators" }).then((r) => r.json());
  assert.ok(!rows.some((row) => row.username === "@VtgShadowScribe"));
});

test("a private character never reaches the listing", async () => {
  const rows = await app.inject({ method: "GET", url: "/public/creators" }).then((r) => r.json());
  const covers = rows.flatMap((row) => row.characters.map((character) => character.alias));
  assert.ok(!covers.includes("Work In Progress"));
});

test("the listing says nothing about addresses or passwords", async () => {
  const body = await app.inject({ method: "GET", url: "/public/creators" }).then((r) => r.body);
  assert.ok(!body.includes("vantaorigin.test"), "no email addresses");
  assert.ok(!/passwordHash|password_hash/.test(body), "no password hashes");
});

// slice(0, limit) counts from the end when limit is negative, so a clamp on
// the upper bound alone quietly dropped creators off the bottom of the list.
test("a limit that makes no sense does not shorten the list", async () => {
  // A second publisher, so dropping one off the end is visible at all.
  const other = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "second-publisher@vantaorigin.test", username: "inkwell", password: "supersecret1" },
    })
  );
  await confirm(other);
  const theirCategory = await app
    .inject({ method: "POST", url: "/categories", headers: { cookie: other }, payload: { name: "Comic" } })
    .then((res) => res.json());
  await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie: other },
    payload: { name: "Quill", categoryId: theirCategory.id, isPublic: true },
  });

  const all = await app.inject({ method: "GET", url: "/public/creators" }).then((r) => r.json());
  assert.ok(all.length > 1, "need more than one creator for this to mean anything");

  for (const limit of ["-1", "-2", "0", "abc", "", "null", "-1e9"]) {
    const rows = await app
      .inject({ method: "GET", url: `/public/creators?limit=${limit}` })
      .then((r) => r.json());
    assert.equal(rows.length, all.length, `limit=${limit}`);
  }

  // A fraction is floored rather than handed to slice as it is.
  const two = await app
    .inject({ method: "GET", url: "/public/creators?limit=2.7" })
    .then((r) => r.json());
  assert.equal(two.length, 2);

  // And the ceiling still holds.
  const capped = await app
    .inject({ method: "GET", url: "/public/creators?limit=100000" })
    .then((r) => r.json());
  assert.equal(capped.length, all.length);
});

// ---- the public page, grouped the way the hub groups it ----
// A creator files characters under categories they named. The public page
// shows those groups, so the names have to reach it.
test("the creator page carries the categories their published work sits in", async () => {
  const page = await app.inject({ method: "GET", url: "/public/creators/emberforge" }).then((r) => r.json());
  assert.ok(Array.isArray(page.categories), "categories came back");
  assert.deepEqual(page.categories.map((c) => c.name), ["Comic"]);

  // The character has to carry the id, or the page cannot file it.
  const ember = page.characters.find((c) => c.name === "Ember Knight");
  assert.equal(ember.categoryId, page.categories[0].id);
});

// A category holding nothing but private work names a project the creator
// has not announced, and would draw an empty box on their page.
test("a category with nothing published in it is not named", async () => {
  const secret = await app
    .inject({
      method: "POST",
      url: "/categories",
      headers: { cookie },
      payload: { name: "Unannounced sequel" },
    })
    .then((res) => res.json());

  await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Still Drafting", categoryId: secret.id, isPublic: false },
  });

  const page = await app.inject({ method: "GET", url: "/public/creators/emberforge" }).then((r) => r.json());
  assert.ok(!page.categories.some((c) => c.name === "Unannounced sequel"));
  assert.ok(!JSON.stringify(page.characters).includes("Still Drafting"));
});
