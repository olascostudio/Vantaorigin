// Buying a printed copy.
//
// Three things matter here and the rest is plumbing. An order's money has to
// be frozen, so a cost table edited tomorrow cannot change what somebody
// agreed to today. The ledger has to add back to the total exactly, or the
// question "who is owed what" has no answer. And a book that is not on sale
// has to be unbuyable, however good the price on it looks, because the thing
// standing between a creator and selling below cost is a flag on a row.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-checkout-test";
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
let creator;
let onSale;
let notQuoted;

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

const buy = (payload) => app.inject({ method: "POST", url: "/orders", payload });

const ADDRESS = { line1: "12 Awolowo Road", city: "Lagos" };
const BUYER = { buyerName: "A Reader", buyerEmail: "reader@example.test", address: ADDRESS };

before(async () => {
  await migrate();
  app = await buildApp();
  admin = await signUp("boss@vantaorigin.test", "boss");
  creator = await signUp("creator@vantaorigin.test", "acreator");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });
  await db.update(schema.countries).set({ enabled: true });

  // The creator is in the studio: Distribution is invitation only, and a
  // book cannot be made without that.
  const everyone = await db.select().from(schema.users);
  for (const person of everyone) {
    await db.insert(schema.studioMembers).values({ userId: person.id }).onConflictDoNothing();
  }

  // Real costs, so a real book can be priced against them.
  const printer = await post("/admin/distribution/printers", admin, {
    name: "Printfactory",
    countryCode: "NG",
  }).then((r) => r.json());

  await post("/admin/distribution/printer-costs", admin, {
    printerId: printer.id,
    formatSlug: "pb-6x9-bw",
    minQuantity: 1,
    unitCostMinor: "320000",
    isPlaceholder: false,
  });

  await post("/admin/distribution/delivery-rates", admin, {
    countryCode: "NG",
    parcelCostMinor: "150000",
    extraCopyMinor: "20000",
    estDaysMin: 2,
    estDaysMax: 4,
    courier: "GIG Logistics",
    isPlaceholder: false,
  });

  // One book priced and on sale.
  onSale = await post("/me/books", creator, {
    title: "Killionaire",
    formatSlug: "pb-6x9-bw",
    pageCount: 120,
  }).then((r) => r.json());

  const quoted = await app
    .inject({ method: "GET", url: `/me/books/${onSale.publicId}/quote`, headers: { cookie: creator } })
    .then((r) => r.json());
  const ng = quoted.countries.find((c) => c.countryCode === "NG");

  await app.inject({
    method: "PUT",
    url: `/me/books/${onSale.publicId}/price`,
    headers: { cookie: creator },
    payload: { countryCode: "NG", retailMinor: String(ng.floorMinor + 300000) },
  });

  await db
    .update(schema.books)
    .set({ status: "on_sale" })
    .where(eq(schema.books.publicId, onSale.publicId));

  // And one in a format nobody has quoted for.
  notQuoted = await post("/me/books", creator, {
    title: "A comic",
    formatSlug: "comic-6625x1025",
    pageCount: 32,
  }).then((r) => r.json());
  await db
    .update(schema.books)
    .set({ status: "on_sale" })
    .where(eq(schema.books.publicId, notQuoted.publicId));
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

// ---- what a reader sees ----

test("a book on sale can be read by anybody, with a price and a delivery window", async () => {
  const res = await app.inject({ method: "GET", url: `/public/books/${onSale.publicId}` });
  assert.equal(res.statusCode, 200);

  const page = res.json();
  assert.equal(page.title, "Killionaire");
  assert.equal(page.creator.username, "@acreator");

  const ng = page.countries.find((c) => c.countryCode === "NG");
  assert.equal(ng.available, true);
  assert.ok(ng.totalMinor > ng.retailMinor, "the total should carry delivery on top");
  assert.equal(ng.estDaysMin, 2);
  assert.equal(ng.courier, "GIG Logistics");
});

test("a draft is not a book anybody else can see", async () => {
  const draft = await post("/me/books", creator, {
    title: "Unfinished",
    formatSlug: "pb-6x9-bw",
    pageCount: 40,
  }).then((r) => r.json());

  const res = await app.inject({ method: "GET", url: `/public/books/${draft.publicId}` });
  assert.equal(res.statusCode, 404);
});

test("a book whose costs nobody has quoted says so instead of offering a price", async () => {
  const page = await app
    .inject({ method: "GET", url: `/public/books/${notQuoted.publicId}` })
    .then((r) => r.json());

  const ng = page.countries.find((c) => c.countryCode === "NG");
  assert.equal(ng.available, false);
  assert.ok(ng.why, "it should say why, rather than just going quiet");
});

// ---- ordering ----

test("an order freezes its money and comes back with a token", async () => {
  const res = await buy({ ...BUYER, bookId: onSale.publicId, countryCode: "NG", quantity: 1 });
  assert.equal(res.statusCode, 201);

  const order = res.json();
  assert.equal(order.status, "pending_payment");
  assert.equal(order.currency, "NGN");
  assert.ok(order.statusToken.length >= 40, "the token is the only key to this order");
  assert.equal(order.totalMinor, order.retailMinor + order.deliveryMinor);
});

test("the ledger adds back to the total, exactly", async () => {
  const order = await buy({
    ...BUYER,
    bookId: onSale.publicId,
    countryCode: "NG",
    quantity: 2,
  }).then((r) => r.json());

  const [row] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.publicId, order.publicId));

  const entries = await db
    .select()
    .from(schema.ledgerEntries)
    .where(eq(schema.ledgerEntries.orderId, row.id));

  assert.equal(entries.length, 4, "printer, courier, platform, creator");

  // Four parties, not five: the gateway takes its cut on the way in and
  // never reaches our account, so there is nobody to pay. The ledger
  // therefore accounts for what ARRIVES, which is the total less that fee.
  const summed = entries.reduce((total, entry) => total + entry.amountMinor, 0);
  assert.equal(
    summed,
    row.totalMinor - row.gatewayFeeMinor,
    `the ledger says ${summed} and what arrives is ${row.totalMinor - row.gatewayFeeMinor}`
  );
  assert.ok(row.gatewayFeeMinor > 0, "a sale with no card fee is not testing the thing above");

  // And the creator's share is recorded against the creator, so a payout has
  // somebody to pay.
  const earned = entries.find((entry) => entry.party === "creator");
  assert.ok(earned.partyUserId, "a creator's earning with nobody attached cannot be paid");
  assert.ok(earned.amountMinor > 0);
});

test("buying five is cheaper per copy than buying one five times", async () => {
  const one = await app
    .inject({
      method: "POST",
      url: "/checkout/quote",
      payload: { bookId: onSale.publicId, countryCode: "NG", quantity: 1 },
    })
    .then((r) => r.json());

  const five = await app
    .inject({
      method: "POST",
      url: "/checkout/quote",
      payload: { bookId: onSale.publicId, countryCode: "NG", quantity: 5 },
    })
    .then((r) => r.json());

  assert.ok(
    five.totalMinor < one.totalMinor * 5,
    "five copies share one parcel, so they must cost less than five parcels"
  );
});

test("the line item remembers the book as it was sold", async () => {
  const order = await buy({
    ...BUYER,
    bookId: onSale.publicId,
    countryCode: "NG",
    quantity: 1,
  }).then((r) => r.json());

  const [row] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.publicId, order.publicId));
  const [item] = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, row.id));

  // Copied, not joined: a creator renaming their book next week must not
  // change what somebody's receipt says they bought.
  assert.equal(item.title, "Killionaire");
  assert.equal(item.formatSlug, "pb-6x9-bw");
  assert.equal(item.pageCount, 120);
  assert.ok(item.unitPrinterCostMinor > 0, "what the printer is owed is part of the sale");
});

// ---- what cannot be bought ----

test("a book nobody has quoted costs for cannot be bought", async () => {
  const res = await buy({
    ...BUYER,
    bookId: notQuoted.publicId,
    countryCode: "NG",
    quantity: 1,
  });
  assert.equal(res.statusCode, 409);
});

test("a country we have not opened cannot be ordered into", async () => {
  await db.update(schema.countries).set({ enabled: false }).where(eq(schema.countries.code, "GB"));

  const res = await buy({ ...BUYER, bookId: onSale.publicId, countryCode: "GB", quantity: 1 });
  assert.equal(res.statusCode, 409);
});

test("an order needs somewhere to send it", async () => {
  const res = await buy({
    bookId: onSale.publicId,
    countryCode: "NG",
    quantity: 1,
    buyerName: "A Reader",
    buyerEmail: "reader@example.test",
    address: { city: "Lagos" },
  });
  assert.equal(res.statusCode, 400);
});

test("a quantity nobody means is refused", async () => {
  for (const quantity of [0, -1, 500]) {
    const res = await buy({ ...BUYER, bookId: onSale.publicId, countryCode: "NG", quantity });
    assert.equal(res.statusCode, 400, `quantity ${quantity}`);
  }
});

// ---- looking at it afterwards ----

test("an order opens with its token and with nothing else", async () => {
  const order = await buy({
    ...BUYER,
    bookId: onSale.publicId,
    countryCode: "NG",
    quantity: 1,
  }).then((r) => r.json());

  assert.equal(typeof order.publicId, "string", `the order was not created: ${JSON.stringify(order)}`);

  const right = await app.inject({
    method: "GET",
    url: `/orders/${order.publicId}?token=${encodeURIComponent(order.statusToken)}`,
  });
  assert.equal(right.statusCode, 200, `lookup failed: ${right.body}`);
  assert.equal(right.json().items[0].title, "Killionaire");

  // A wrong token and a missing order answer the same way, so neither tells
  // somebody which of the two they have.
  const wrong = await app.inject({ method: "GET", url: `/orders/${order.publicId}?token=nope` });
  assert.equal(wrong.statusCode, 404);

  const none = await app.inject({ method: "GET", url: `/orders/${order.publicId}` });
  assert.equal(none.statusCode, 404);

  const missing = await app.inject({ method: "GET", url: "/orders/nosuchorder?token=nope" });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.json(), wrong.json(), "the two refusals must read identically");
});

test("the order does not hand out the buyer's address to anybody with the token", async () => {
  const order = await buy({
    ...BUYER,
    bookId: onSale.publicId,
    countryCode: "NG",
    quantity: 1,
  }).then((r) => r.json());

  const seen = await app
    .inject({
      method: "GET",
      url: `/orders/${order.publicId}?token=${encodeURIComponent(order.statusToken)}`,
    })
    .then((r) => r.json());

  // The token travels in a link in an email. It is enough to show somebody
  // where their order is; it is not a reason to repeat their address back
  // to whoever is holding it.
  assert.equal(seen.address, undefined);
  assert.equal(seen.buyerEmail, undefined);
  assert.equal(seen.statusToken, undefined);
});
