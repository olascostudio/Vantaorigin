// A creator's own sales.
//
// The ledger was written from the first order and read by nothing, so the
// question these answer is simply whether a creator can see their own
// money. The ones that matter are the boundaries: that one creator never
// sees another's orders or another's share, and that naira and pounds are
// never added together into a number that is true of nothing.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-creator-sales-test";
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
let one;
let two;
let oneId;
let twoId;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

const signUp = async (email, username) =>
  cookieFrom(
    await app.inject({ method: "POST", url: "/auth/signup", payload: { email, username, password: "supersecret1" } })
  );

const get = (url, cookie) => app.inject({ method: "GET", url, headers: { cookie } });

// An order placed straight into the tables. The checkout's own path is
// tested where it lives; what matters here is only that the reader finds
// the right rows and adds them up correctly.
async function placeOrder({ bookId, creatorId, currency, shareMinor, status, when }) {
  const [order] = await db
    .insert(schema.orders)
    .values({
      publicId: `ord-${Math.random().toString(36).slice(2, 10)}`,
      statusToken: `tok-${Math.random().toString(36).slice(2, 12)}`,
      countryCode: currency === "NGN" ? "NG" : "GB",
      currency,
      buyerName: "A Reader",
      buyerEmail: "reader@example.test",
      status,
      ...(when ? { createdAt: when } : {}),
    })
    .returning();

  await db.insert(schema.orderItems).values({
    orderId: order.id,
    bookId,
    creatorId,
    title: "Whatever",
    formatSlug: "pb-6x9-bw",
    pageCount: 100,
    quantity: 1,
    unitRetailMinor: shareMinor,
  });

  await db.insert(schema.ledgerEntries).values({
    orderId: order.id,
    party: "creator",
    partyUserId: creatorId,
    amountMinor: shareMinor,
    currency,
  });

  return order;
}

before(async () => {
  await migrate();
  app = await buildApp();
  admin = await signUp("boss@vantaorigin.test", "boss");
  one = await signUp("one@vantaorigin.test", "creatorone");
  two = await signUp("two@vantaorigin.test", "creatortwo");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });

  const people = await db.select().from(schema.users);
  oneId = people.find((row) => row.email === "one@vantaorigin.test").id;
  twoId = people.find((row) => row.email === "two@vantaorigin.test").id;

  await db.insert(schema.studioMembers).values([{ userId: oneId }, { userId: twoId }]).onConflictDoNothing();
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a creator with nothing sold gets zeroes, not an error", async () => {
  const res = await get("/me/studio/summary", one);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    booksPublished: 0,
    booksTotal: 0,
    ordersThisMonth: 0,
    awaitingFulfilment: 0,
    heldMinor: {},
    recent: [],
  });
});

test("somebody outside the studio cannot ask at all", async () => {
  const outsider = await signUp("outsider@vantaorigin.test", "outsider");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });
  assert.equal((await get("/me/studio/summary", outsider)).statusCode, 404);
  assert.equal((await get("/me/studio/orders", outsider)).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: "/me/studio/orders" })).statusCode, 401);
});

test("a creator sees their own orders and their own share, and nobody else's", async () => {
  const [mine] = await db
    .insert(schema.books)
    .values({
      publicId: "bk-mine",
      creatorId: oneId,
      title: "Mine",
      formatSlug: "pb-6x9-bw",
      pageCount: 100,
      status: "on_sale",
    })
    .returning();

  const [theirs] = await db
    .insert(schema.books)
    .values({
      publicId: "bk-theirs",
      creatorId: twoId,
      title: "Theirs",
      formatSlug: "pb-6x9-bw",
      pageCount: 100,
      status: "on_sale",
    })
    .returning();

  await placeOrder({ bookId: mine.id, creatorId: oneId, currency: "NGN", shareMinor: 400000, status: "paid" });
  await placeOrder({ bookId: theirs.id, creatorId: twoId, currency: "NGN", shareMinor: 999999, status: "paid" });

  const ours = await get("/me/studio/orders", one).then((r) => r.json());
  assert.equal(ours.orders.length, 1, "one order, not two");
  assert.equal(ours.orders[0].yourShareMinor, 400000);
  assert.deepEqual(ours.orders[0].titles, ["Mine"]);

  // The decisive one: the other creator's far larger share must not appear
  // anywhere in this answer.
  assert.ok(
    !JSON.stringify(ours).includes("999999"),
    "another creator's share must never reach this creator"
  );
  assert.ok(!JSON.stringify(ours).includes("Theirs"));

  const theirSide = await get("/me/studio/orders", two).then((r) => r.json());
  assert.equal(theirSide.orders.length, 1);
  assert.equal(theirSide.orders[0].yourShareMinor, 999999);
});

test("naira and pounds are held apart rather than added together", async () => {
  const [book] = await db.select().from(schema.books).where(eq(schema.books.publicId, "bk-mine"));
  await placeOrder({ bookId: book.id, creatorId: oneId, currency: "GBP", shareMinor: 500, status: "paid" });

  const summary = await get("/me/studio/summary", one).then((r) => r.json());
  assert.deepEqual(summary.heldMinor, { NGN: 400000, GBP: 500 });
  assert.equal(summary.booksPublished, 1);
  assert.equal(summary.ordersThisMonth, 2);
  assert.equal(summary.awaitingFulfilment, 2, "paid is not yet fulfilled");
});

test("a completed order stops being held and stops awaiting fulfilment", async () => {
  const [book] = await db.select().from(schema.books).where(eq(schema.books.publicId, "bk-mine"));
  const done = await placeOrder({
    bookId: book.id,
    creatorId: oneId,
    currency: "NGN",
    shareMinor: 111111,
    status: "completed",
  });
  assert.ok(done.publicId);

  const summary = await get("/me/studio/summary", one).then((r) => r.json());
  assert.equal(summary.heldMinor.NGN, 400000, "the completed order's share is no longer held");
  assert.equal(summary.awaitingFulfilment, 2, "and it is not awaiting fulfilment either");

  // It is still one of their orders, though. Settled is not deleted.
  const list = await get("/me/studio/orders", one).then((r) => r.json());
  assert.equal(list.orders.length, 3);
});

test("two ledger lines against one order are summed, not overwritten", async () => {
  const [book] = await db.select().from(schema.books).where(eq(schema.books.publicId, "bk-mine"));
  const order = await placeOrder({
    bookId: book.id,
    creatorId: oneId,
    currency: "NGN",
    shareMinor: 300000,
    status: "paid",
  });

  // A correction is a second entry against the same order, never an edit to
  // the first, so the creator's share is the sum of both.
  await db.insert(schema.ledgerEntries).values({
    orderId: order.id,
    party: "creator",
    partyUserId: oneId,
    kind: "adjustment",
    amountMinor: -50000,
    currency: "NGN",
  });

  const list = await get("/me/studio/orders", one).then((r) => r.json());
  const row = list.orders.find((entry) => entry.publicId === order.publicId);
  assert.equal(row.yourShareMinor, 250000);
});
