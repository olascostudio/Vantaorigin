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
