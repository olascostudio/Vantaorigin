// Letting a creator into Creator Studio.
//
// Distribution is built and not open, and this is the only door. So the
// questions are the same ones the printer invite had to answer: that the
// link is the only way in, that it works once, and that a withdrawn or
// expired one stops working. If any of those is wrong, "not open" is a
// claim rather than a fact.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-studio-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { eq } = await import("drizzle-orm");

let app;
let admin;
let outsider;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const signUp = async (email, username) =>
  cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email, username, password: "supersecret1" },
    })
  );

const post = (url, cookie, payload) =>
  app.inject({ method: "POST", url, headers: cookie ? { cookie } : {}, payload });

const inviteTo = async (email) =>
  post("/admin/studio-invites", admin, { email }).then((r) => r.json());

before(async () => {
  await migrate();
  app = await buildApp();
  admin = await signUp("boss@vantaorigin.test", "boss");
  outsider = await signUp("nobody@vantaorigin.test", "nobody");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

// ---- who is in ----

test("an admin has the studio without being invited", async () => {
  const res = await app.inject({ method: "GET", url: "/me/studio", headers: { cookie: admin } });
  assert.equal(res.json().studio, true);
  assert.equal(res.json().admin, true);
});

test("an ordinary account does not", async () => {
  const res = await app.inject({ method: "GET", url: "/me/studio", headers: { cookie: outsider } });
  assert.equal(res.json().studio, false);

  // And the feature is not found rather than refused, so the answer says
  // nothing about whether it exists.
  const books = await app.inject({ method: "GET", url: "/me/books", headers: { cookie: outsider } });
  assert.equal(books.statusCode, 404);
});

test("signed out, there is no studio at all", async () => {
  const res = await app.inject({ method: "GET", url: "/me/studio" });
  assert.equal(res.json().studio, false);
});

// ---- inviting ----

test("only an admin can invite a creator", async () => {
  const res = await post("/admin/studio-invites", outsider, { email: "x@example.test" });
  assert.notEqual(res.statusCode, 201);

  const none = await post("/admin/studio-invites", "", { email: "x@example.test" });
  assert.notEqual(none.statusCode, 201);
});

test("the link comes back once and is never stored in the clear", async () => {
  const invite = await inviteTo("comics@example.test");
  assert.ok(invite.token.length >= 40);

  const listed = await app
    .inject({ method: "GET", url: "/admin/studio-invites", headers: { cookie: admin } })
    .then((r) => r.json());
  assert.equal(listed.invites[0].tokenHash, undefined, "a list of working invitations is not a list");

  const [row] = await db
    .select()
    .from(schema.studioInvites)
    .where(eq(schema.studioInvites.email, "comics@example.test"));
  assert.notEqual(row.tokenHash, invite.token);
  assert.equal(row.tokenHash.length, 64);
});

test("a token nobody was sent opens nothing", async () => {
  const res = await app.inject({ method: "GET", url: "/studio/invite/not-a-real-token" });
  assert.equal(res.statusCode, 404);
});

// ---- accepting ----

test("accepting makes an account that has the studio, and burns the link", async () => {
  const invite = await inviteTo("newcreator@example.test");

  const res = await post(`/studio/invite/${invite.token}/accept`, "", {
    username: "newcreator",
    password: "supersecret1",
  });
  assert.equal(res.statusCode, 201);

  const them = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signin",
      payload: { email: "newcreator@example.test", password: "supersecret1" },
    })
  );

  const mine = await app.inject({ method: "GET", url: "/me/studio", headers: { cookie: them } });
  assert.equal(mine.json().studio, true);
  assert.equal(mine.json().admin, false, "an invited creator is not an admin");

  // And they can now actually do the thing they were invited for.
  const made = await post("/me/books", them, {
    title: "Their comic",
    formatSlug: "comic-6625x1025",
    pageCount: 32,
  });
  assert.equal(made.statusCode, 201);

  // The same link a second time does nothing.
  assert.equal(
    (await app.inject({ method: "GET", url: `/studio/invite/${invite.token}` })).statusCode,
    404
  );
  assert.equal(
    (await post(`/studio/invite/${invite.token}/accept`, "", {
      username: "again",
      password: "supersecret1",
    })).statusCode,
    404
  );
});

test("an invited creator sees only their own books", async () => {
  const first = await inviteTo("one@example.test");
  await post(`/studio/invite/${first.token}/accept`, "", {
    username: "creatorone",
    password: "supersecret1",
  });
  const second = await inviteTo("two@example.test");
  await post(`/studio/invite/${second.token}/accept`, "", {
    username: "creatortwo",
    password: "supersecret1",
  });

  const signIn = async (email) =>
    cookieFrom(
      await app.inject({
        method: "POST",
        url: "/auth/signin",
        payload: { email, password: "supersecret1" },
      })
    );

  const one = await signIn("one@example.test");
  const two = await signIn("two@example.test");

  await post("/me/books", one, { title: "Mine", formatSlug: "pb-6x9-bw", pageCount: 60 });

  const theirs = await app
    .inject({ method: "GET", url: "/me/books", headers: { cookie: two } })
    .then((r) => r.json());

  // Being let into the studio is not being let into everybody else's work.
  assert.deepEqual(theirs.books, []);
});

test("a withdrawn invite stops working", async () => {
  const invite = await inviteTo("pulled@example.test");
  const [row] = await db
    .select()
    .from(schema.studioInvites)
    .where(eq(schema.studioInvites.email, "pulled@example.test"));

  assert.equal((await post(`/admin/studio-invites/${row.id}/revoke`, admin, {})).statusCode, 200);
  assert.equal(
    (await app.inject({ method: "GET", url: `/studio/invite/${invite.token}` })).statusCode,
    404
  );
});

test("an expired invite says so rather than pretending it never existed", async () => {
  const invite = await inviteTo("late@example.test");
  await db
    .update(schema.studioInvites)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(schema.studioInvites.email, "late@example.test"));

  const res = await app.inject({ method: "GET", url: `/studio/invite/${invite.token}` });
  assert.equal(res.statusCode, 410);
});

test("a link will not take over an account that already exists", async () => {
  const invite = await inviteTo("nobody@vantaorigin.test");
  const res = await post(`/studio/invite/${invite.token}/accept`, "", {
    username: "takeover",
    password: "supersecret1",
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().needsSignIn, true);
});
