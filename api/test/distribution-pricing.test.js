// The pricing engine, which decides whether a book can be sold and for how
// much, and therefore whether anybody loses money.
//
// None of this needs a database, a printer or a payment provider: the engine
// takes its numbers as arguments, so the rules can be held still long before
// a single real quote exists.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GATEWAY_FEES,
  bandFor,
  deliveryCost,
  floorFor,
  gatewayFee,
  isTrustworthy,
  placeholdersIn,
  printingCost,
  quote,
  whyNotSellable,
} from "../src/distribution/pricing.js";

// All figures below are in kobo unless the name says otherwise. They are
// deliberately the seeded placeholders: the point is the arithmetic, not the
// amounts, and no real quote exists to use instead.
const NAIRA = (n) => n * 100;

const comicBands = [
  { minQuantity: 1, unitCostMinor: NAIRA(3200), packagingMinor: NAIRA(250), perPageMinor: 0, isPlaceholder: false },
  { minQuantity: 5, unitCostMinor: NAIRA(2400), packagingMinor: NAIRA(250), perPageMinor: 0, isPlaceholder: false },
];

const lagos = {
  parcelCostMinor: NAIRA(1500),
  extraCopyMinor: NAIRA(200),
  estDaysMin: 2,
  estDaysMax: 4,
  isPlaceholder: false,
};

const base = {
  bands: comicBands,
  rate: lagos,
  pageCount: 32,
  provider: "paystack",
  currency: "NGN",
  platformFeeBps: 1000,
};

// ---- the pieces ----

test("the band that applies is the best one the quantity reaches", () => {
  assert.equal(bandFor(comicBands, 1).minQuantity, 1);
  assert.equal(bandFor(comicBands, 4).minQuantity, 1);
  assert.equal(bandFor(comicBands, 5).minQuantity, 5);
  assert.equal(bandFor(comicBands, 50).minQuantity, 5);
});

test("bands are picked by quantity, not by the order they arrive in", () => {
  const shuffled = [comicBands[1], comicBands[0]];
  assert.equal(bandFor(shuffled, 5).minQuantity, 5);
  assert.equal(bandFor(shuffled, 2).minQuantity, 1);
});

test("a quantity below every band has no band at all", () => {
  assert.equal(bandFor([{ minQuantity: 10 }], 3), null);
  assert.throws(() => printingCost({ band: null, pageCount: 32, quantity: 1 }), /No printer cost band/);
});

test("packaging is charged once for the parcel, not once per copy", () => {
  const one = printingCost({ band: comicBands[0], pageCount: 32, quantity: 1 });
  const two = printingCost({ band: comicBands[0], pageCount: 32, quantity: 2 });
  assert.equal(one, NAIRA(3200) + NAIRA(250));
  assert.equal(two, NAIRA(3200) * 2 + NAIRA(250));
});

test("a per-page printer is charged per page per copy", () => {
  const band = { minQuantity: 1, unitCostMinor: NAIRA(100), packagingMinor: 0, perPageMinor: 500 };
  // 100 naira + 180 pages at 5 naira = 1000 naira a copy, twice over.
  assert.equal(printingCost({ band, pageCount: 180, quantity: 2 }), NAIRA(1000) * 2);
});

// The whole reason tiers exist: copies share a parcel.
test("delivery is per parcel plus the extra copies in it", () => {
  assert.equal(deliveryCost({ rate: lagos, quantity: 1 }), NAIRA(1500));
  assert.equal(deliveryCost({ rate: lagos, quantity: 5 }), NAIRA(1500) + NAIRA(200) * 4);
});

test("five copies cost far less to deliver than five separate orders", () => {
  const together = deliveryCost({ rate: lagos, quantity: 5 });
  const separately = deliveryCost({ rate: lagos, quantity: 1 }) * 5;
  assert.ok(together < separately);
  assert.equal(together, NAIRA(2300));
  assert.equal(separately, NAIRA(7500));
});

// ---- the gateway ----

test("Paystack waives its flat fee on small amounts and caps the whole thing", () => {
  // Under NGN 2,500: percentage only.
  assert.equal(gatewayFee("paystack", NAIRA(1000)), Math.ceil((NAIRA(1000) * 150) / 10000));
  // Over the waiver: percentage plus NGN 100.
  assert.equal(gatewayFee("paystack", NAIRA(10000)), NAIRA(150) + NAIRA(100));
  // Far enough up, the cap bites and the fee stops growing.
  assert.equal(gatewayFee("paystack", NAIRA(1000000)), NAIRA(2000));
  assert.equal(gatewayFee("paystack", NAIRA(5000000)), NAIRA(2000));
});

test("a gateway fee is rounded up, never down", () => {
  // 1.5% of 101 kobo is 1.515, which must cost us 2 and not 1.
  const table = { t: { rateBps: 150, fixedMinor: 0, waiveFixedUnderMinor: 0, capMinor: null, confirmed: true } };
  assert.equal(gatewayFee("t", 101, table), 2);
});

test("nothing is charged on nothing", () => {
  assert.equal(gatewayFee("paystack", 0), 0);
});

test("an unknown provider is an error, not a free transaction", () => {
  assert.throws(() => gatewayFee("nobody", 1000), /No gateway fee rule/);
});

// ---- the floor ----

// The floor has to cover a fee that is itself a percentage of a total the
// floor helps decide. Getting this wrong by adding it up once leaves the
// creator paying the difference.
test("the floor covers its own fees once settled", () => {
  const printing = NAIRA(3450);
  const delivery = NAIRA(1500);
  const floor = floorFor({ printing, delivery, provider: "paystack", platformFeeBps: 1000 });

  const charged = floor + delivery;
  const gateway = gatewayFee("paystack", charged);
  const platform = Math.ceil((floor * 1000) / 10000);

  assert.ok(floor >= printing + gateway + platform, "the floor pays for everything it is supposed to");
  // And it is not wastefully above: a naira less would not cover it.
  const short = floor - 100;
  const shortGateway = gatewayFee("paystack", short + delivery);
  const shortPlatform = Math.ceil((short * 1000) / 10000);
  assert.ok(short < printing + shortGateway + shortPlatform, "the floor is the lowest price that works");
});

test("the floor rises when the reader is not the one paying delivery", () => {
  const args = { printing: NAIRA(3450), delivery: NAIRA(1500), provider: "paystack", platformFeeBps: 1000 };
  const reader = floorFor({ ...args, deliveryPaidByReader: true });
  const creator = floorFor({ ...args, deliveryPaidByReader: false });
  assert.ok(creator > reader);
  assert.ok(creator - reader >= NAIRA(1500), "it absorbs at least the delivery itself");
});

test("a fee that eats everything is reported, not looped over forever", () => {
  const greedy = { all: { rateBps: 9500, fixedMinor: 0, waiveFixedUnderMinor: 0, capMinor: null, confirmed: true } };
  assert.throws(
    () => floorFor({ printing: NAIRA(1000), delivery: 0, provider: "all", platformFeeBps: 1000, gatewayTable: greedy }),
    /did not settle/
  );
});

// ---- a whole quote ----

test("the shares add back to exactly what the reader paid", () => {
  for (const quantity of [1, 2, 5, 11]) {
    const q = quote({ ...base, quantity, retailMinor: NAIRA(9500) * quantity });
    const sum = q.deliveryMinor + q.printingMinor + q.gatewayFeeMinor + q.platformFeeMinor + q.creatorMinor;
    assert.equal(sum, q.totalMinor, `quantity ${quantity} adds up`);
  }
});

test("every figure in a quote is a whole number of minor units", () => {
  const q = quote({ ...base, quantity: 3, retailMinor: NAIRA(28500) });
  for (const [key, value] of Object.entries(q)) {
    if (typeof value === "number") {
      assert.ok(Number.isInteger(value), `${key} is a whole number, got ${value}`);
    }
  }
});

test("a price at the floor is allowed; a kobo under it is not", () => {
  const ask = quote({ ...base, quantity: 1 });
  const at = quote({ ...base, quantity: 1, retailMinor: ask.floorMinor });
  const under = quote({ ...base, quantity: 1, retailMinor: ask.floorMinor - 1 });

  assert.equal(at.belowFloor, false);
  assert.equal(at.sellable, true);
  assert.equal(under.belowFloor, true);
  assert.equal(under.sellable, false);
  assert.match(whyNotSellable(under), /below what the book costs/);
});

test("selling at the floor leaves the creator nothing, and never less", () => {
  const ask = quote({ ...base, quantity: 1 });
  const at = quote({ ...base, quantity: 1, retailMinor: ask.floorMinor });
  assert.ok(at.creatorMinor >= 0, "the floor is never a loss");
  assert.ok(at.creatorMinor < NAIRA(100), "and it is not quietly profitable either");
});

// The point of 15.1: buying five has to be better per copy than buying one.
test("the per-copy floor falls as the quantity rises", () => {
  const one = quote({ ...base, quantity: 1 }).perCopyFloorMinor;
  const five = quote({ ...base, quantity: 5 }).perCopyFloorMinor;
  const ten = quote({ ...base, quantity: 10 }).perCopyFloorMinor;
  assert.ok(five < one, "five is cheaper per copy than one");
  assert.ok(ten < five, "and ten is cheaper still");
});

test("the floor is computed at the quantity being bought, not once at one copy", () => {
  // A price that clears the floor at one copy must not be assumed to clear
  // it at five. This is the trap 15.1 warns about.
  const atOne = quote({ ...base, quantity: 1 });
  const five = quote({ ...base, quantity: 5, retailMinor: atOne.floorMinor * 5 });
  assert.equal(five.belowFloor, false);
  assert.notEqual(five.floorMinor, atOne.floorMinor * 5, "the five-copy floor is its own number");
});

// ---- placeholders ----

test("a placeholder cost can be quoted but never sold against", () => {
  const guessed = [{ ...comicBands[0], isPlaceholder: true }];
  const q = quote({ ...base, bands: guessed, quantity: 1, retailMinor: NAIRA(9500) });

  assert.equal(q.belowFloor, false, "the price itself is fine");
  assert.equal(q.sellable, false, "but it still cannot go on sale");
  assert.deepEqual(q.placeholders, ["printer cost"]);
  assert.match(whyNotSellable(q), /placeholder, not a real quote/);
});

test("every guessed input is named, not just the first", () => {
  const found = placeholdersIn({
    band: { isPlaceholder: true },
    rate: { isPlaceholder: true },
    provider: "stripe",
  });
  assert.deepEqual(found, ["printer cost", "delivery rate", "gateway fee"]);
});

test("Stripe is treated as unconfirmed until somebody checks its real rate", () => {
  assert.equal(GATEWAY_FEES.stripe.confirmed, false);
  assert.equal(GATEWAY_FEES.paystack.confirmed, true);
  assert.equal(isTrustworthy({ band: comicBands[0], rate: lagos, provider: "stripe" }), false);
  assert.equal(isTrustworthy({ band: comicBands[0], rate: lagos, provider: "paystack" }), true);
});

test("asking only for the floor gives no shares to misread", () => {
  const ask = quote({ ...base, quantity: 1 });
  assert.ok(ask.floorMinor > 0);
  assert.equal(ask.retailMinor, undefined);
  assert.equal(ask.creatorMinor, undefined);
});

// ---- things that should be refused ----

test("a quantity that is not a whole number above zero is refused", () => {
  for (const quantity of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => quote({ ...base, quantity }), /whole number/, `quantity ${quantity}`);
  }
});

test("a destination we have no rate for is an error, not free delivery", () => {
  assert.throws(() => quote({ ...base, rate: null, quantity: 1 }), /No delivery rate/);
});

// ---------------------------------------------------------------------------
// Everything below came out of a review of the first version. Each test is a
// hole somebody found, kept open so it cannot close again.
// ---------------------------------------------------------------------------

test("a price that is not a whole number of minor units is refused", () => {
  // A bigint column read outside Drizzle's number mapping arrives as a
  // string. Unchecked, adding it to delivery concatenated instead: the total
  // left the engine as "950000150000" and the creator was credited billions
  // on a quote that called itself sellable.
  for (const retailMinor of ["950000", Number.NaN, Infinity, -1, 1.5]) {
    assert.throws(
      () => quote({ ...base, quantity: 1, retailMinor }),
      /whole number of minor units/,
      `retailMinor ${String(retailMinor)}`
    );
  }
});

test("a valid price still produces numbers, not strings", () => {
  const q = quote({ ...base, quantity: 1, retailMinor: NAIRA(9500) });
  assert.equal(typeof q.totalMinor, "number");
  assert.equal(typeof q.creatorMinor, "number");
});

// The waiver cliff: Paystack waives its flat NGN 100 below NGN 2,500, so
// crossing that line adds NGN 100 to the fee in one step while the floor
// stays put. A creator rounding up to a tidy NGN 2,000 lost about NGN 99 a
// copy, and the engine called it sellable because it only asked whether the
// price was above the floor.
const cheapBand = [
  { minQuantity: 1, unitCostMinor: NAIRA(1762), packagingMinor: 0, perPageMinor: 0, isPlaceholder: false },
];
const nearby = { parcelCostMinor: NAIRA(500), extraCopyMinor: 0, estDaysMin: 1, estDaysMax: 2, isPlaceholder: false };

test("a price above the floor that still loses money is not sellable", () => {
  const onTheCliff = quote({
    ...base,
    bands: cheapBand,
    rate: nearby,
    quantity: 1,
    retailMinor: NAIRA(2000),
  });

  assert.equal(onTheCliff.belowFloor, false, "it really is above the floor");
  assert.ok(onTheCliff.creatorMinor < 0, "and the creator really does lose money");
  assert.equal(onTheCliff.losesMoney, true);
  assert.equal(onTheCliff.sellable, false, "so it must not be sellable");
  assert.match(whyNotSellable(onTheCliff), /threshold/);
});

test("no sellable price ever leaves the creator out of pocket", () => {
  // Swept across the cliff and past it, a kobo at a time.
  let checked = 0;
  for (let retail = NAIRA(1990); retail <= NAIRA(2200); retail += 1) {
    const q = quote({ ...base, bands: cheapBand, rate: nearby, quantity: 1, retailMinor: retail });
    if (q.sellable) {
      assert.ok(q.creatorMinor >= 0, `sellable at ${retail} but the creator gets ${q.creatorMinor}`);
    }
    checked += 1;
  }
  assert.ok(checked > 20000, "the sweep actually ran");
});

// A floor that exists must be returned, not thrown over.
test("a raised platform fee still gets a floor instead of an exception", () => {
  for (const platformFeeBps of [2000, 2906, 3500, 5000, 7500]) {
    const ask = quote({ ...base, quantity: 1, platformFeeBps });
    assert.ok(ask.floorMinor > 0, `${platformFeeBps} bps has a floor`);

    const priced = quote({ ...base, quantity: 1, platformFeeBps, retailMinor: ask.floorMinor });
    assert.ok(priced.creatorMinor >= 0, `${platformFeeBps} bps floor is solvent`);
  }
});

test("a fee that really cannot be covered says so accurately", () => {
  const greedy = { all: { rateBps: 9500, fixedMinor: 0, waiveFixedUnderMinor: 0, capMinor: null, confirmed: true } };
  assert.throws(
    () => floorFor({ printing: NAIRA(1000), delivery: 0, provider: "all", platformFeeBps: 1000, gatewayTable: greedy }),
    /at or above 100%/,
    "it names the real cause rather than guessing at one"
  );
});

// ---- failing closed ----

test("a cost with no placeholder flag at all is treated as a guess", () => {
  assert.deepEqual(placeholdersIn({}), ["printer cost", "delivery rate", "gateway fee"]);
  assert.equal(isTrustworthy({}), false);
  assert.equal(isTrustworthy({ band: {}, rate: {}, provider: "paystack" }), false);
});

test("the database spelling of the flag is understood", () => {
  // Drizzle maps it to isPlaceholder; raw SQL hands back is_placeholder. A
  // row that says it is a guess must be read as one either way.
  const found = placeholdersIn({
    band: { is_placeholder: true },
    rate: { is_placeholder: false },
    provider: "paystack",
  });
  assert.deepEqual(found, ["printer cost"]);
});

test("a provider we hold no rule for is never confirmed", () => {
  assert.ok(placeholdersIn({ band: comicBands[0], rate: lagos, provider: "flutterwave" }).includes("gateway fee"));
  assert.equal(isTrustworthy({ band: comicBands[0], rate: lagos, provider: "constructor" }), false);
});

test("a fee rule is never found on the prototype", () => {
  for (const name of ["constructor", "toString", "hasOwnProperty"]) {
    assert.throws(() => gatewayFee(name, NAIRA(1000)), /No gateway fee rule/, name);
  }
});

test("both reasons are given when a price is bad in two ways at once", () => {
  const guessed = [{ ...comicBands[0], isPlaceholder: true }];
  const q = quote({ ...base, bands: guessed, quantity: 1, retailMinor: 1 });
  const why = whyNotSellable(q);
  assert.match(why, /below what the book costs/);
  assert.match(why, /placeholder/);
});

// ---- bands ----

test("two printers quoting the same step give the same answer either way round", () => {
  const cheap = { minQuantity: 1, unitCostMinor: NAIRA(3200), packagingMinor: 0, perPageMinor: 0, isPlaceholder: false };
  const dear = { minQuantity: 1, unitCostMinor: NAIRA(9999), packagingMinor: 0, perPageMinor: 0, isPlaceholder: false };

  // Whichever order the rows arrive in, and the dearer one wins: a floor
  // that is too high costs nobody, one that is too low costs every sale.
  assert.equal(bandFor([cheap, dear], 3).unitCostMinor, NAIRA(9999));
  assert.equal(bandFor([dear, cheap], 3).unitCostMinor, NAIRA(9999));
});

test("a band with no usable quantity is ignored rather than matched", () => {
  assert.equal(bandFor([{ minQuantity: null, unitCostMinor: 1 }], 5), null);
  assert.equal(bandFor([{ unitCostMinor: 1 }], 5), null);
  assert.equal(bandFor(undefined, 5), null);
});

// ---- invariants the first suite left unguarded ----

test("the per-copy floor, times the quantity, always covers the floor", () => {
  // The checkout shows a per-copy price. Rounding it down would advertise a
  // figure that does not add up to a sellable total.
  for (let quantity = 1; quantity <= 40; quantity += 1) {
    const q = quote({ ...base, quantity });
    assert.ok(
      q.perCopyFloorMinor * quantity >= q.floorMinor,
      `quantity ${quantity}: ${q.perCopyFloorMinor} x ${quantity} is under ${q.floorMinor}`
    );
  }
});

test("the platform fee is rounded the same way wherever it is worked out", () => {
  // floorFor and quote each compute it. If they disagree by a kobo, a price
  // exactly at the floor stops being solvent.
  for (const printing of [123457, 777711, 5003]) {
    const bands = [
      { minQuantity: 1, unitCostMinor: printing, packagingMinor: 0, perPageMinor: 0, isPlaceholder: false },
    ];
    const ask = quote({ ...base, bands, quantity: 1 });
    const atFloor = quote({ ...base, bands, quantity: 1, retailMinor: ask.floorMinor });
    assert.ok(atFloor.creatorMinor >= 0, `printing ${printing}: the floor is not solvent`);
    assert.equal(atFloor.sellable, true);
  }
});
