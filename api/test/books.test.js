// A creator's books.
//
// Until this existed, Distribution was seventeen tables, a tested pricing
// engine and an admin screen, with nothing able to create the thing they are
// all about. These tests care about the three rules that would otherwise live
// only in a comment: that a book has to suit the format it is printed in,
// that a price has to cover what the book costs, and that one creator cannot
// touch another's work.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-books-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { eq } = await import("drizzle-orm");
const { RIGHTS_WARRANTY_VERSION } = await import("../src/routes/books.js");

let app;
let creator;
let other;
let admin;
let book;

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
  app.inject({ method: "POST", url, headers: { cookie }, payload });

before(async () => {
  await migrate();
  app = await buildApp();
  admin = await signUp("boss@vantaorigin.test", "boss");
  creator = await signUp("creator@vantaorigin.test", "acreator");
  other = await signUp("other@vantaorigin.test", "anothercreator");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

// ---- making one ----

test("a creator can make a book, and it starts as a draft nobody has priced", async () => {
  const res = await post("/me/books", creator, {
    title: "Killionaire",
    formatSlug: "pb-6x9-bw",
    pageCount: 120,
  });

  assert.equal(res.statusCode, 201);
  book = res.json();
  assert.equal(book.status, "draft");
  assert.equal(book.rightsAccepted, false);
  assert.deepEqual(book.prices, []);
  assert.ok(book.publicId, "a book needs an address of its own");
  // Not a number somebody can count up from to find a stranger's draft.
  assert.ok(book.publicId.length >= 10, `public id too short to be unguessable: ${book.publicId}`);
});

test("the page count has to suit the format", async () => {
  // 0032 wanted this as a database trigger and could not have one, so it was
  // written down as a thing the app must do. If this test goes, the rule goes
  // with it and a printer finds out instead.
  const tooThin = await post("/me/books", creator, {
    title: "Too thin",
    formatSlug: "pb-6x9-bw",
    pageCount: 8,
  });
  assert.equal(tooThin.statusCode, 400);
  assert.match(tooThin.json().error, /starts at 24 pages/);

  const tooFat = await post("/me/books", creator, {
    title: "Too fat",
    formatSlug: "comic-6625x1025",
    pageCount: 400,
  });
  assert.equal(tooFat.statusCode, 400);
  assert.match(tooFat.json().error, /stops at 64 pages/);
});

test("a saddle stitched book is folded, so its pages come four at a time", async () => {
  const odd = await post("/me/books", creator, {
    title: "Not a multiple of four",
    formatSlug: "comic-6625x1025",
    pageCount: 30,
  });
  assert.equal(odd.statusCode, 400);
  assert.match(odd.json().error, /divide by four/);

  const fine = await post("/me/books", creator, {
    title: "A comic",
    formatSlug: "comic-6625x1025",
    pageCount: 32,
  });
  assert.equal(fine.statusCode, 201);
});

test("a format we do not have is refused rather than stored", async () => {
  const res = await post("/me/books", creator, {
    title: "Hardback",
    formatSlug: "leather-bound-folio",
    pageCount: 100,
  });
  assert.equal(res.statusCode, 404);
});

// ---- whose book it is ----

test("one creator cannot read, change or delete another's book", async () => {
  const read = await app.inject({
    method: "GET",
    url: `/me/books/${book.publicId}`,
    headers: { cookie: other },
  });
  assert.equal(read.statusCode, 404, "a stranger's book should not even be found");

  const change = await app.inject({
    method: "PATCH",
    url: `/me/books/${book.publicId}`,
    headers: { cookie: other },
    payload: { title: "Mine now" },
  });
  assert.equal(change.statusCode, 404);

  const gone = await app.inject({
    method: "DELETE",
    url: `/me/books/${book.publicId}`,
    headers: { cookie: other },
  });
  assert.equal(gone.statusCode, 404);

  // And it is still there, still called what the creator called it.
  const still = await app
    .inject({ method: "GET", url: `/me/books/${book.publicId}`, headers: { cookie: creator } })
    .then((r) => r.json());
  assert.equal(still.title, "Killionaire");
});

test("signing out loses the lot", async () => {
  for (const url of ["/me/books", `/me/books/${book.publicId}`]) {
    const res = await app.inject({ method: "GET", url });
    assert.notEqual(res.statusCode, 200, url);
  }
});

// ---- pricing ----

test("a country we have not opened refuses a price before anything else is asked", async () => {
  // The countries ship disabled, which is the right default: a creator
  // pricing into somewhere we cannot deliver to is being set up to fail.
  const res = await app.inject({
    method: "PUT",
    url: `/me/books/${book.publicId}/price`,
    headers: { cookie: creator },
    payload: { countryCode: "NG", retailMinor: "500000" },
  });

  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /not open for selling/);
});

test("open for selling but with no printer quoted, a book still cannot be priced", async () => {
  await db.update(schema.countries).set({ enabled: true });

  const res = await app.inject({
    method: "PUT",
    url: `/me/books/${book.publicId}/price`,
    headers: { cookie: creator },
    payload: { countryCode: "NG", retailMinor: "500000" },
  });

  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /No printer has quoted/);
});

test("with real costs in, a price under the floor is refused and told the floor", async () => {
  // The admin side, which already has its own tests, used here to get real
  // numbers underneath a real book.
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
    estDaysMin: 2,
    estDaysMax: 4,
    isPlaceholder: false,
  });

  const tooLow = await app.inject({
    method: "PUT",
    url: `/me/books/${book.publicId}/price`,
    headers: { cookie: creator },
    payload: { countryCode: "NG", retailMinor: "1000" },
  });

  assert.equal(tooLow.statusCode, 409);
  assert.ok(tooLow.json().floorMinor > 320000, "the refusal should name a floor above the printing");
  assert.match(tooLow.json().error, /does not cover/);
});

test("a price that covers its costs is kept, and says what the creator earns", async () => {
  const floor = await app
    .inject({
      method: "GET",
      url: `/me/books/${book.publicId}/quote`,
      headers: { cookie: creator },
    })
    .then((r) => r.json());

  const ng = floor.countries.find((c) => c.countryCode === "NG");
  assert.ok(ng.floorMinor > 0, "the quote should carry a floor");

  const res = await app.inject({
    method: "PUT",
    url: `/me/books/${book.publicId}/price`,
    headers: { cookie: creator },
    payload: { countryCode: "NG", retailMinor: String(ng.floorMinor + 200000) },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.json().currency, "NGN");
  assert.ok(res.json().creatorKeepsMinor > 0, "a price above the floor should leave something");
});

test("a price has to be whole minor units", async () => {
  for (const retailMinor of ["5000.50", "5,000", "-1", "", "cheap"]) {
    const res = await app.inject({
      method: "PUT",
      url: `/me/books/${book.publicId}/price`,
      headers: { cookie: creator },
      payload: { countryCode: "NG", retailMinor },
    });
    assert.equal(res.statusCode, 400, `retailMinor ${JSON.stringify(retailMinor)}`);
  }
});

// ---- changing the shape of a book ----

test("changing the format throws away a price agreed against the old one", async () => {
  const before = await app
    .inject({ method: "GET", url: `/me/books/${book.publicId}`, headers: { cookie: creator } })
    .then((r) => r.json());
  assert.equal(before.prices.length, 1, "there should be a price to lose");

  const res = await app.inject({
    method: "PATCH",
    url: `/me/books/${book.publicId}`,
    headers: { cookie: creator },
    payload: { pageCount: 300 },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().pricesCleared, true);
  assert.deepEqual(res.json().prices, [], "a price checked against the old shape is not a price");
});

test("renaming a book keeps its price, because nothing about the cost moved", async () => {
  const quoted = await app
    .inject({ method: "GET", url: `/me/books/${book.publicId}/quote`, headers: { cookie: creator } })
    .then((r) => r.json());
  const ng = quoted.countries.find((c) => c.countryCode === "NG");

  await app.inject({
    method: "PUT",
    url: `/me/books/${book.publicId}/price`,
    headers: { cookie: creator },
    payload: { countryCode: "NG", retailMinor: String(ng.floorMinor + 100000) },
  });

  const res = await app.inject({
    method: "PATCH",
    url: `/me/books/${book.publicId}`,
    headers: { cookie: creator },
    payload: { title: "Killionaire: A Hard Reign Is Gonna Fall" },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().pricesCleared, false);
  assert.ok(res.json().prices.length > 0, "renaming should not cost the creator their price");
});

// ---- the warranty ----

test("the rights warranty is recorded with the version that was agreed to", async () => {
  const res = await post(`/me/books/${book.publicId}/rights`, creator, {
    accepted: true,
    version: RIGHTS_WARRANTY_VERSION,
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().rightsAccepted, true);
  assert.equal(res.json().rightsWarrantyVersion, RIGHTS_WARRANTY_VERSION);
  assert.ok(res.json().rightsWarrantyAcceptedAt, "when they agreed is the point of recording it");
});

test("agreeing to a version we no longer use is refused", async () => {
  // If the wording changes, an old acceptance does not say what the new one
  // says, and treating it as though it did is the whole risk.
  const res = await post(`/me/books/${book.publicId}/rights`, creator, {
    accepted: true,
    version: "1999-01-01",
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().version, RIGHTS_WARRANTY_VERSION);
});

test("not agreeing is not agreeing", async () => {
  const res = await post(`/me/books/${book.publicId}/rights`, creator, {
    accepted: false,
    version: RIGHTS_WARRANTY_VERSION,
  });
  assert.equal(res.statusCode, 400);
});

// ---- removing one ----

test("a draft can be deleted, and its prices go with it", async () => {
  const made = await post("/me/books", creator, {
    title: "A false start",
    formatSlug: "pb-6x9-bw",
    pageCount: 50,
  }).then((r) => r.json());

  const gone = await app.inject({
    method: "DELETE",
    url: `/me/books/${made.publicId}`,
    headers: { cookie: creator },
  });
  assert.equal(gone.statusCode, 204);

  const after = await app.inject({
    method: "GET",
    url: `/me/books/${made.publicId}`,
    headers: { cookie: creator },
  });
  assert.equal(after.statusCode, 404);
});

test("a book that is no longer a draft cannot be deleted out from under a buyer", async () => {
  const made = await post("/me/books", creator, {
    title: "Sold",
    formatSlug: "pb-6x9-bw",
    pageCount: 60,
  }).then((r) => r.json());

  await db
    .update(schema.books)
    .set({ status: "on_sale" })
    .where(eq(schema.books.publicId, made.publicId));

  const res = await app.inject({
    method: "DELETE",
    url: `/me/books/${made.publicId}`,
    headers: { cookie: creator },
  });
  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /Take it off sale/);
});
