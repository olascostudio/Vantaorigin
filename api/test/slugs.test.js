// The readable part of a character's address.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-slugs-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { slugify } = await import("../src/db/slugs.js");

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

const make = (payload) =>
  app.inject({ method: "POST", url: "/characters", headers: { cookie }, payload }).then((r) => r.json());

before(async () => {
  await migrate();
  app = await buildApp();
  cookie = await confirm(
    cookieFrom(
      await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: { email: "slugs@vantaorigin.test", username: "slugger", password: "supersecret1" },
      })
    )
  );
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a name becomes the readable part of the address", () => {
  assert.equal(slugify("Urokojin"), "urokojin");
  assert.equal(slugify("Urokojin: The Thunder Judge"), "urokojin-the-thunder-judge");
  assert.equal(slugify("  Atlas   Veyron  "), "atlas-veyron");
  assert.equal(slugify("Ọbáàlú"), "obaalu");
  assert.equal(slugify("!!!"), "");
});

test("a character is made with an address that says its name", async () => {
  const character = await make({ name: "Urokojin", isPublic: true });
  assert.equal(character.slug, "urokojin");
});

test("two characters of the same name do not fight over one address", async () => {
  const second = await make({ name: "Urokojin", isPublic: true });
  assert.notEqual(second.slug, "urokojin");
  assert.match(second.slug, /^urokojin-[a-z0-9]+$/);
});

test("a name with nothing to spell still gets an address", async () => {
  const character = await make({ name: "!!!", isPublic: true });
  assert.ok(character.slug, "has an address");
  assert.match(character.slug, /^character/);
});

test("both addresses reach the same character", async () => {
  const character = await make({ name: "Atlas Veyron", isPublic: true });

  const bySlug = await app.inject({ method: "GET", url: "/public/characters/atlas-veyron" });
  const byId = await app.inject({ method: "GET", url: `/public/characters/${character.id}` });

  assert.equal(bySlug.statusCode, 200);
  assert.equal(byId.statusCode, 200);
  assert.equal(bySlug.json().id, byId.json().id);
  assert.equal(bySlug.json().name, "Atlas Veyron");
});

test("capitals in a pasted address do not matter", async () => {
  const res = await app.inject({ method: "GET", url: "/public/characters/ATLAS-VEYRON" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().name, "Atlas Veyron");
});

test("a private character is not reachable by either address", async () => {
  const hidden = await make({ name: "Kept Back", isPublic: false });

  for (const address of [hidden.slug, hidden.id]) {
    const res = await app.inject({ method: "GET", url: `/public/characters/${address}` });
    assert.equal(res.statusCode, 404, address);
  }
});

test("renaming a character leaves its address alone", async () => {
  const character = await make({ name: "First Name", isPublic: true });

  const renamed = await app.inject({
    method: "PATCH",
    url: `/characters/${character.id}`,
    headers: { cookie },
    payload: { name: "Second Name" },
  });

  assert.equal(renamed.json().name, "Second Name");
  assert.equal(renamed.json().slug, character.slug, "the link people shared still works");
});
