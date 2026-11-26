// The print partner's door, and what is behind it.
//
// A printer sees buyers' names, addresses and phone numbers, because a
// parcel needs them. So the question these tests keep asking is "who else
// can get at this": the invite has to be the only way in, a used or
// withdrawn one has to stop working, and one shop must not see another's
// jobs or a buyer's money.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-printer-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { AGREEMENT_VERSION } = await import("../src/distribution/print-agreement.js");
const { eq } = await import("drizzle-orm");

let app;
let admin;
let outsider;
let shop;
let rival;
let orderId;

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

const inviteTo = async (printerId, email) =>
  post(`/admin/distribution/printers/${printerId}/invite`, admin, { email }).then((r) => r.json());

before(async () => {
  await migrate();
  app = await buildApp();
  admin = await signUp("boss@vantaorigin.test", "boss");
  outsider = await signUp("nosy@vantaorigin.test", "nosy");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });

  shop = await post("/admin/distribution/printers", admin, {
    name: "Printfactory",
    countryCode: "NG",
  }).then((r) => r.json());

  rival = await post("/admin/distribution/printers", admin, {
    name: "Somebody Else Press",
    countryCode: "NG",
  }).then((r) => r.json());

  // A paid order sitting with the first shop.
  const [order] = await db
    .insert(schema.orders)
    .values({
      publicId: "job-one",
      statusToken: "t",
      countryCode: "NG",
      currency: "NGN",
      buyerName: "A Reader",
      buyerEmail: "reader@example.test",
      buyerPhone: "08000000000",
      address: { line1: "12 Awolowo Road", city: "Lagos" },
      status: "paid",
      printerId: shop.id,
      totalMinor: 850000,
    })
    .returning();
  orderId = order.id;

  await db.insert(schema.orderItems).values({
    orderId: order.id,
    bookId: null,
    quantity: 1,
    unitRetailMinor: 700000,
    title: "Killionaire",
    formatSlug: "pb-6x9-bw",
    pageCount: 120,
    creatorId: null,
  });
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

// ---- who can invite ----

test("only an admin can invite a printer", async () => {
  const res = await post(`/admin/distribution/printers/${shop.id}/invite`, outsider, {
    email: "print@example.test",
  });
  assert.notEqual(res.statusCode, 201);

  const none = await post(`/admin/distribution/printers/${shop.id}/invite`, "", {
    email: "print@example.test",
  });
  assert.notEqual(none.statusCode, 201);
});

test("the invite link comes back once and is never stored in the clear", async () => {
  const invite = await inviteTo(shop.id, "print@example.test");
  assert.ok(invite.token.length >= 40, "the token is the whole door");

  // The listing an admin sees must not carry it.
  const listed = await app
    .inject({
      method: "GET",
      url: `/admin/distribution/printers/${shop.id}/invites`,
      headers: { cookie: admin },
    })
    .then((r) => r.json());

  assert.equal(listed.invites[0].tokenHash, undefined, "a list of working invitations is not a list");
  assert.equal(listed.invites[0].state, "waiting");

  // And the row holds a hash, not the token.
  const [row] = await db.select().from(schema.printerInvites).limit(1);
  assert.notEqual(row.tokenHash, invite.token);
  assert.equal(row.tokenHash.length, 64, "sha256, the way a session token is kept");
});

// ---- the door ----

test("the agreement is shown before anybody can accept it", async () => {
  const invite = await inviteTo(shop.id, "reader1@example.test");
  const res = await app.inject({ method: "GET", url: `/print/invite/${invite.token}` });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().printer.name, "Printfactory");
  assert.equal(res.json().agreement.version, AGREEMENT_VERSION);
  assert.ok(res.json().agreement.sections.length > 0, "there has to be something to read");
});

test("a token nobody was sent opens nothing", async () => {
  const res = await app.inject({ method: "GET", url: "/print/invite/not-a-real-token" });
  assert.equal(res.statusCode, 404);
});

test("there is no way to become a printer without an invite", async () => {
  // The portal is the only thing behind the door, and an ordinary account
  // signed up the normal way is not a printer.
  const res = await app.inject({
    method: "GET",
    url: "/me/printer",
    headers: { cookie: outsider },
  });
  assert.equal(res.statusCode, 404);
});

test("accepting makes an account, attaches it to the shop, and burns the invite", async () => {
  const invite = await inviteTo(shop.id, "newprinter@example.test");

  const res = await post(`/print/invite/${invite.token}/accept`, "", {
    accepted: true,
    agreementVersion: AGREEMENT_VERSION,
    username: "printfactory",
    password: "supersecret1",
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.json().printer.name, "Printfactory");

  // The same link a second time does nothing.
  const again = await app.inject({ method: "GET", url: `/print/invite/${invite.token}` });
  assert.equal(again.statusCode, 404);

  const twice = await post(`/print/invite/${invite.token}/accept`, "", {
    accepted: true,
    agreementVersion: AGREEMENT_VERSION,
    username: "printfactory2",
    password: "supersecret1",
  });
  assert.equal(twice.statusCode, 404);

  // What they agreed to is recorded on the person, not only on the invite.
  const [link] = await db.select().from(schema.printerUsers);
  assert.equal(link.agreementVersion, AGREEMENT_VERSION);
});

test("agreeing to a version we no longer show is refused", async () => {
  const invite = await inviteTo(shop.id, "old@example.test");
  const res = await post(`/print/invite/${invite.token}/accept`, "", {
    accepted: true,
    agreementVersion: "1999-01-01",
    username: "oldtimer",
    password: "supersecret1",
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().version, AGREEMENT_VERSION);
});

test("a withdrawn invite stops working", async () => {
  const invite = await inviteTo(shop.id, "withdrawn@example.test");
  const [row] = await db
    .select()
    .from(schema.printerInvites)
    .where(eq(schema.printerInvites.email, "withdrawn@example.test"));

  const pulled = await post(`/admin/distribution/invites/${row.id}/revoke`, admin, {});
  assert.equal(pulled.statusCode, 200);

  const res = await app.inject({ method: "GET", url: `/print/invite/${invite.token}` });
  assert.equal(res.statusCode, 404);
});

test("an expired invite says so rather than pretending it never existed", async () => {
  const invite = await inviteTo(shop.id, "late@example.test");
  await db
    .update(schema.printerInvites)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(schema.printerInvites.email, "late@example.test"));

  const res = await app.inject({ method: "GET", url: `/print/invite/${invite.token}` });
  assert.equal(res.statusCode, 410);
  assert.match(res.json().error, /expired/);
});

test("a link will not take over an account that already exists", async () => {
  const invite = await inviteTo(shop.id, "nosy@vantaorigin.test");
  const res = await post(`/print/invite/${invite.token}/accept`, "", {
    accepted: true,
    agreementVersion: AGREEMENT_VERSION,
    username: "takeover",
    password: "supersecret1",
  });

  assert.equal(res.statusCode, 409);
  assert.equal(res.json().needsSignIn, true);
});

// ---- the portal ----

test("a printer sees their own jobs, with what a parcel needs", async () => {
  const printer = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signin",
      payload: { email: "newprinter@example.test", password: "supersecret1" },
    })
  );

  const res = await app.inject({
    method: "GET",
    url: "/me/printer/orders",
    headers: { cookie: printer },
  });

  assert.equal(res.statusCode, 200);
  const job = res.json().jobs[0];
  assert.equal(job.publicId, "job-one");
  assert.equal(job.buyerName, "A Reader");
  assert.equal(job.address.city, "Lagos");
  assert.equal(job.items[0].title, "Killionaire");

  // And nothing about anybody's money. A printer is paid their quoted cost;
  // what the book sold for and what the creator earned is not their business.
  assert.equal(job.totalMinor, undefined);
  assert.equal(job.retailMinor, undefined);
  assert.equal(job.buyerEmail, undefined);
  assert.equal(job.statusToken, undefined);
});

test("a shop cannot see or touch another shop's job", async () => {
  const invite = await inviteTo(rival.id, "rival@example.test");
  await post(`/print/invite/${invite.token}/accept`, "", {
    accepted: true,
    agreementVersion: AGREEMENT_VERSION,
    username: "rivalpress",
    password: "supersecret1",
  });

  const theirs = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signin",
      payload: { email: "rival@example.test", password: "supersecret1" },
    })
  );

  const list = await app
    .inject({ method: "GET", url: "/me/printer/orders", headers: { cookie: theirs } })
    .then((r) => r.json());
  assert.deepEqual(list.jobs, [], "a rival's queue should be empty, not somebody else's");

  const touch = await app.inject({
    method: "PATCH",
    url: "/me/printer/orders/job-one",
    headers: { cookie: theirs },
    payload: { status: "in_production" },
  });
  assert.equal(touch.statusCode, 404, "somebody else's job is not found, not refused");
});

test("somebody with no shop at all gets nothing", async () => {
  for (const url of ["/me/printer", "/me/printer/orders"]) {
    const res = await app.inject({ method: "GET", url, headers: { cookie: outsider } });
    assert.equal(res.statusCode, 404, url);

    const none = await app.inject({ method: "GET", url });
    assert.notEqual(none.statusCode, 200, `${url} signed out`);
  }
});

test("a printer moves a job along, and a shipped one needs a tracking number", async () => {
  const printer = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signin",
      payload: { email: "newprinter@example.test", password: "supersecret1" },
    })
  );

  const move = (payload) =>
    app.inject({
      method: "PATCH",
      url: "/me/printer/orders/job-one",
      headers: { cookie: printer },
      payload,
    });

  assert.equal((await move({ status: "in_production" })).statusCode, 200);

  const noTracking = await move({ status: "shipped" });
  assert.equal(noTracking.statusCode, 400);
  assert.match(noTracking.json().error, /tracking number/);

  const shipped = await move({
    status: "shipped",
    courier: "GIG Logistics",
    trackingNumber: "GIG123456",
  });
  assert.equal(shipped.statusCode, 200);
  assert.equal(shipped.json().trackingNumber, "GIG123456");

  // Every move is written down, with who made it.
  const events = await db
    .select()
    .from(schema.orderEvents)
    .where(eq(schema.orderEvents.orderId, orderId));
  assert.ok(events.length >= 2);
  assert.ok(events.every((event) => event.actor === "printer"));
});

test("a job nobody has paid for cannot be started", async () => {
  const [order] = await db
    .insert(schema.orders)
    .values({
      publicId: "job-unpaid",
      statusToken: "t2",
      countryCode: "NG",
      currency: "NGN",
      buyerName: "B Reader",
      buyerEmail: "b@example.test",
      address: { line1: "1 Road", city: "Lagos" },
      status: "pending_payment",
      printerId: shop.id,
    })
    .returning();
  assert.ok(order.id);

  const printer = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signin",
      payload: { email: "newprinter@example.test", password: "supersecret1" },
    })
  );

  const res = await app.inject({
    method: "PATCH",
    url: "/me/printer/orders/job-unpaid",
    headers: { cookie: printer },
    payload: { status: "in_production" },
  });

  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /not been paid/);
});
