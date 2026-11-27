// The screen where a printer's quote finally gets typed in.
//
// Until this existed the costs could only be set by hand written SQL, so
// these tests care most about two things: that only an admin can touch the
// numbers a creator's price is judged against, and that saving a real quote
// actually stops it being a placeholder, which is what lets a book be sold.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-distadmin-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");

let app;
let admin;
let ordinary;
let printerId;

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

before(async () => {
  await migrate();
  app = await buildApp();

  admin = await signUp("boss@vantaorigin.test", "boss");
  ordinary = await signUp("creator@vantaorigin.test", "acreator");
  await db.update(schema.users).set({ emailVerifiedAt: new Date() });
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

// ---- who may touch the numbers ----

test("a creator cannot read the costs their own prices are judged against", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/admin/distribution/rates",
    headers: { cookie: ordinary },
  });
  assert.notEqual(res.statusCode, 200);
});

test("a creator cannot write a printer cost", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/distribution/printer-costs",
    headers: { cookie: ordinary },
    payload: {
      printerId: "00000000-0000-0000-0000-000000000000",
      formatSlug: "comic-6625x1025",
      minQuantity: 1,
      unitCostMinor: "1",
    },
  });
  assert.notEqual(res.statusCode, 201);
  assert.notEqual(res.statusCode, 200);
});

test("nobody signed out gets near any of it", async () => {
  for (const url of ["/admin/distribution/rates", "/admin/distribution/preview"]) {
    const res = await app.inject({ method: "GET", url });
    assert.notEqual(res.statusCode, 200, url);
  }
});

// ---- what the screen loads ----

test("the admin gets everything the screen needs in one request", async () => {
  const page = await app
    .inject({ method: "GET", url: "/admin/distribution/rates", headers: { cookie: admin } })
    .then((r) => r.json());

  assert.equal(page.formats.length, 3, "the three formats the spec names");
  assert.deepEqual(
    page.countries.map((c) => c.code).sort(),
    ["GB", "NG"]
  );
  assert.equal(page.settings.platformFeeBps, 1000);
  assert.equal(page.settings.inspectionWindowHours, 48);
  // Nothing has been quoted yet, so there is nothing to count.
  assert.equal(page.printerCosts.length, 0);
  assert.equal(page.placeholders.printerCosts, 0);
  // And Stripe is still flagged as unconfirmed, as the engine has it.
  assert.equal(page.gatewayFees.stripe.confirmed, false);
  assert.equal(page.gatewayFees.paystack.confirmed, true);
});

// ---- adding a printer and their quote ----

test("a printer can be added, and only into a country we know", async () => {
  const nowhere = await app.inject({
    method: "POST",
    url: "/admin/distribution/printers",
    headers: { cookie: admin },
    payload: { name: "Somewhere Press", countryCode: "ZZ" },
  });
  assert.equal(nowhere.statusCode, 404);

  const res = await app.inject({
    method: "POST",
    url: "/admin/distribution/printers",
    headers: { cookie: admin },
    payload: { name: "Printfactory", countryCode: "NG", contactEmail: "print@example.test" },
  });
  assert.equal(res.statusCode, 201);
  printerId = res.json().id;
  assert.ok(printerId);
});

test("a quote saved as real stops being a placeholder, and is dated", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/distribution/printer-costs",
    headers: { cookie: admin },
    payload: {
      printerId,
      formatSlug: "comic-6625x1025",
      minQuantity: 1,
      unitCostMinor: "320000",
      packagingMinor: "25000",
      isPlaceholder: false,
      notes: "Quoted on the phone, 22 Nov",
    },
  });

  assert.equal(res.statusCode, 201);
  const band = res.json();
  assert.equal(band.unitCostMinor, 320000);
  assert.equal(band.isPlaceholder, false);
  assert.ok(band.quotedAt, "a real quote records when it was given");
});

test("saving the same step again corrects it instead of making a second one", async () => {
  await app.inject({
    method: "POST",
    url: "/admin/distribution/printer-costs",
    headers: { cookie: admin },
    payload: {
      printerId,
      formatSlug: "comic-6625x1025",
      minQuantity: 1,
      unitCostMinor: "330000",
      isPlaceholder: false,
    },
  });

  const page = await app
    .inject({ method: "GET", url: "/admin/distribution/rates", headers: { cookie: admin } })
    .then((r) => r.json());

  const forComics = page.printerCosts.filter(
    (b) => b.formatSlug === "comic-6625x1025" && b.minQuantity === 1
  );
  assert.equal(forComics.length, 1, "one band, corrected");
  assert.equal(forComics[0].unitCostMinor, 330000);
});

test("money has to arrive as whole minor units", async () => {
  for (const unitCostMinor of ["3200.50", "3,200", "-100", "", "lots"]) {
    const res = await app.inject({
      method: "POST",
      url: "/admin/distribution/printer-costs",
      headers: { cookie: admin },
      payload: { printerId, formatSlug: "comic-6625x1025", minQuantity: 1, unitCostMinor },
    });
    assert.equal(res.statusCode, 400, `unitCostMinor ${JSON.stringify(unitCostMinor)}`);
  }
});

// ---- the point of the screen ----

test("before a delivery rate exists, a preview says so rather than guessing", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/distribution/preview",
    headers: { cookie: admin },
    payload: { formatSlug: "comic-6625x1025", countryCode: "NG", pageCount: 32, quantity: 1 },
  });
  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /No delivery rate/);
});

test("with a rate in, the floor comes back from the real engine", async () => {
  const added = await app.inject({
    method: "POST",
    url: "/admin/distribution/delivery-rates",
    headers: { cookie: admin },
    payload: {
      countryCode: "NG",
      region: null,
      parcelCostMinor: "150000",
      extraCopyMinor: "20000",
      estDaysMin: 2,
      estDaysMax: 4,
      courier: "GIG Logistics",
      isPlaceholder: false,
    },
  });
  assert.equal(added.statusCode, 201);

  const q = await app
    .inject({
      method: "POST",
      url: "/admin/distribution/preview",
      headers: { cookie: admin },
      payload: { formatSlug: "comic-6625x1025", countryCode: "NG", pageCount: 32, quantity: 1 },
    })
    .then((r) => r.json());

  assert.ok(q.floorMinor > 330000, "the floor is above the printing cost");
  assert.equal(q.currency, "NGN");
  // Every input is now a real quote, so nothing is holding the book back.
  assert.deepEqual(q.placeholders, []);
  assert.equal(q.trustworthy, true);
});

test("a price below the floor is reported as such, with the shares", async () => {
  const q = await app
    .inject({
      method: "POST",
      url: "/admin/distribution/preview",
      headers: { cookie: admin },
      payload: {
        formatSlug: "comic-6625x1025",
        countryCode: "NG",
        pageCount: 32,
        quantity: 1,
        retailMinor: "100000",
      },
    })
    .then((r) => r.json());

  assert.equal(q.belowFloor, true);
  assert.equal(q.sellable, false);
  assert.equal(
    q.deliveryMinor + q.printingMinor + q.gatewayFeeMinor + q.platformFeeMinor + q.creatorMinor,
    q.totalMinor,
    "the shares still add back exactly"
  );
});

test("buying five is cheaper per copy, through the route and not just the engine", async () => {
  const ask = async (quantity) =>
    app
      .inject({
        method: "POST",
        url: "/admin/distribution/preview",
        headers: { cookie: admin },
        payload: { formatSlug: "comic-6625x1025", countryCode: "NG", pageCount: 32, quantity },
      })
      .then((r) => r.json());

  const one = await ask(1);
  const five = await ask(5);
  assert.ok(five.perCopyFloorMinor < one.perCopyFloorMinor);
});

// ---- the fee that is ours ----

test("the platform fee can be changed, and the floor moves with it", async () => {
  const before = await app
    .inject({
      method: "POST",
      url: "/admin/distribution/preview",
      headers: { cookie: admin },
      payload: { formatSlug: "comic-6625x1025", countryCode: "NG", pageCount: 32, quantity: 1 },
    })
    .then((r) => r.json());

  const saved = await app.inject({
    method: "PATCH",
    url: "/admin/distribution/settings",
    headers: { cookie: admin },
    payload: { platformFeeBps: 700 },
  });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().platformFeeBps, 700);

  const after = await app
    .inject({
      method: "POST",
      url: "/admin/distribution/preview",
      headers: { cookie: admin },
      payload: { formatSlug: "comic-6625x1025", countryCode: "NG", pageCount: 32, quantity: 1 },
    })
    .then((r) => r.json());

  assert.ok(after.floorMinor < before.floorMinor, "a smaller cut means a lower floor");

  // Put it back so the rest of the suite reads the documented default.
  await app.inject({
    method: "PATCH",
    url: "/admin/distribution/settings",
    headers: { cookie: admin },
    payload: { platformFeeBps: 1000 },
  });
});

test("a platform fee nobody could pay is refused", async () => {
  for (const platformFeeBps of [-1, 9000, 10001]) {
    const res = await app.inject({
      method: "PATCH",
      url: "/admin/distribution/settings",
      headers: { cookie: admin },
      payload: { platformFeeBps },
    });
    assert.equal(res.statusCode, 400, `${platformFeeBps} bps`);
  }
});

test("a delivery window that runs backwards is refused", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/distribution/delivery-rates",
    headers: { cookie: admin },
    payload: {
      countryCode: "GB",
      parcelCostMinor: "290",
      estDaysMin: 5,
      estDaysMax: 2,
    },
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /shorter than/);
});

// ---- a quote that is only a guess, and one that stops being real ----
//
// The screen's checkbox defaults to unticked for a band nobody has quoted,
// so this is now the common first save, and nothing covered it. The second
// case is the one that matters: a date saying when a price was quoted, left
// behind on a row that says it was never quoted, is the exact question this
// table exists to answer being answered both ways at once.

test("a band saved as a guess carries no quote date", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/distribution/printer-costs",
    headers: { cookie: admin },
    payload: {
      printerId,
      formatSlug: "pb-6x9-bw",
      minQuantity: 1,
      unitCostMinor: "300000",
      isPlaceholder: true,
    },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.json().isPlaceholder, true);
  assert.equal(res.json().quotedAt, null, "a guess was never quoted");
});

test("demoting a real quote back to a guess clears the date it was quoted", async () => {
  const save = (isPlaceholder) =>
    app
      .inject({
        method: "POST",
        url: "/admin/distribution/printer-costs",
        headers: { cookie: admin },
        payload: {
          printerId,
          formatSlug: "pb-55x85-bw",
          minQuantity: 1,
          unitCostMinor: "280000",
          isPlaceholder,
        },
      })
      .then((r) => r.json());

  const real = await save(false);
  assert.equal(real.isPlaceholder, false);
  assert.ok(real.quotedAt, "a real quote records when it was given");

  const demoted = await save(true);
  assert.equal(demoted.isPlaceholder, true);
  assert.equal(
    demoted.quotedAt,
    null,
    "a row cannot say it is a guess and still carry a quote date"
  );
});

test("the engine says who pays delivery, so a screen need not assume it", async () => {
  const q = await app
    .inject({
      method: "POST",
      url: "/admin/distribution/preview",
      headers: { cookie: admin },
      payload: { formatSlug: "comic-6625x1025", countryCode: "NG", pageCount: 32, quantity: 1 },
    })
    .then((r) => r.json());

  // Without this the only way to know whether the reader's bill is the floor
  // or the floor plus delivery is to guess, and guessing wrong counts
  // delivery twice.
  assert.equal(q.deliveryPaidByReader, true);

  const priced = await app
    .inject({
      method: "POST",
      url: "/admin/distribution/preview",
      headers: { cookie: admin },
      payload: {
        formatSlug: "comic-6625x1025",
        countryCode: "NG",
        pageCount: 32,
        quantity: 1,
        retailMinor: "600000",
      },
    })
    .then((r) => r.json());

  assert.equal(priced.deliveryPaidByReader, true);
  assert.equal(
    priced.totalMinor,
    priced.retailMinor + priced.deliveryMinor,
    "the reader's bill is the price plus delivery in this regime"
  );
});

// ---- opening a country ----
//
// The countries ship disabled, and until now nothing could open one: the
// only way a country became sellable was a hand written UPDATE. A step that
// can only be done in SQL is a step missing from the product.

test("a country cannot be opened before we can deliver there", async () => {
  // GB has no delivery rate in this suite until the test below adds one.
  const res = await app.inject({
    method: "PATCH",
    url: "/admin/distribution/countries/GB",
    headers: { cookie: admin },
    payload: { enabled: true },
  });

  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /delivery rate/);
});

test("with a rate in place a country opens, and can be closed again", async () => {
  // NG got its rate earlier in this file.
  const open = await app.inject({
    method: "PATCH",
    url: "/admin/distribution/countries/NG",
    headers: { cookie: admin },
    payload: { enabled: true },
  });
  assert.equal(open.statusCode, 200);
  assert.equal(open.json().enabled, true);

  // Closing is always allowed: we may need to stop selling somewhere in a
  // hurry, and that must not depend on the state of a rate table.
  const shut = await app.inject({
    method: "PATCH",
    url: "/admin/distribution/countries/NG",
    headers: { cookie: admin },
    payload: { enabled: false },
  });
  assert.equal(shut.statusCode, 200);
  assert.equal(shut.json().enabled, false);

  // Put it back for anything that runs after this.
  await app.inject({
    method: "PATCH",
    url: "/admin/distribution/countries/NG",
    headers: { cookie: admin },
    payload: { enabled: true },
  });
});

test("only an admin can open a country", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: "/admin/distribution/countries/NG",
    headers: { cookie: ordinary },
    payload: { enabled: true },
  });
  assert.notEqual(res.statusCode, 200);
});
