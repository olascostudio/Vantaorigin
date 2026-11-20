// What a book costs, what it may be sold for, and who gets what.
//
// Pure arithmetic. Nothing here touches the database or the network: every
// number it needs is passed in, which is what makes it testable without a
// printer, a payment provider or a country that is open yet.
//
// EVERY VALUE IS AN INTEGER IN MINOR UNITS. Kobo, pence, cents. There is no
// float anywhere in this file and there must never be one: money that goes
// through a float is money that disagrees with itself later.
//
// Two rules decide most of the behaviour here:
//
//   The floor is computed, never stored. A floor saved in a row goes stale
//   the moment a cost changes, and a stale floor is exactly how a book ends
//   up selling below what it costs to make.
//
//   A placeholder cost cannot produce a sellable price. No printer has
//   quoted us, so every seeded cost is marked is_placeholder. The engine
//   will compute with one so the screens have something to show, and will
//   refuse to call the result sellable.

// ---------------------------------------------------------------------------
// Gateway fees
// ---------------------------------------------------------------------------

// What the payment provider takes. Shapes differ, so each one is described
// rather than reduced to a single percentage.
//
// Paystack's figures are from their own support pages: local cards 1.5% plus
// NGN 100, the flat NGN 100 waived under NGN 2,500, the whole fee capped at
// NGN 2,000.
//
// Stripe's are NOT confirmed. The research could not reach a figure for the
// UK, so this is a placeholder and is marked as one: a quote built on it
// says so.
export const GATEWAY_FEES = {
  paystack: {
    rateBps: 150,
    fixedMinor: 10000, // NGN 100
    waiveFixedUnderMinor: 250000, // NGN 2,500
    capMinor: 200000, // NGN 2,000
    confirmed: true,
  },
  stripe: {
    rateBps: 150,
    fixedMinor: 20, // 20p
    waiveFixedUnderMinor: 0,
    capMinor: null,
    confirmed: false,
  },
};

// Always rounds up. A fee we have underestimated comes out of somebody's
// share, and it should not be the creator's.
export function gatewayFee(provider, totalMinor, table = GATEWAY_FEES) {
  const rule = table[provider];
  if (!rule) throw new Error(`No gateway fee rule for ${provider}`);
  if (totalMinor <= 0) return 0;

  const fixed = totalMinor < rule.waiveFixedUnderMinor ? 0 : rule.fixedMinor;
  const fee = Math.ceil((totalMinor * rule.rateBps) / 10000) + fixed;
  return rule.capMinor === null ? fee : Math.min(fee, rule.capMinor);
}

// ---------------------------------------------------------------------------
// Cost of making and moving it
// ---------------------------------------------------------------------------

// Printers quote in steps, so the band that applies is the highest one whose
// min_quantity the order reaches. Ordering the rows is not assumed.
export function bandFor(bands, quantity) {
  const reachable = bands
    .filter((band) => quantity >= band.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity);
  return reachable[0] ?? null;
}

// Per copy, plus a per-page component for printers who quote that way, plus
// packaging once for the whole parcel.
export function printingCost({ band, pageCount, quantity }) {
  if (!band) throw new Error("No printer cost band covers this quantity");
  const perCopy = band.unitCostMinor + band.perPageMinor * pageCount;
  return perCopy * quantity + band.packagingMinor;
}

// Delivery is per parcel, not per copy. Five copies travel in one box, and
// charging five deliveries would make buying five worse than buying one five
// times, which is the opposite of what tiers are for.
export function deliveryCost({ rate, quantity }) {
  if (!rate) throw new Error("No delivery rate covers this destination");
  return rate.parcelCostMinor + rate.extraCopyMinor * Math.max(0, quantity - 1);
}

// ---------------------------------------------------------------------------
// The floor
// ---------------------------------------------------------------------------

// Whether the reader pays delivery on top of the retail price, or the retail
// price has to swallow it.
//
// Section 6 of the spec says the floor is "printer unit cost + packaging +
// delivery cost + estimated gateway fee + platform fee", but the checkout
// also shows delivery to the reader as a separate line added to the total.
// Both at once counts delivery twice: the creator covers it out of their
// price AND the reader pays it again. Only one can be true.
//
// The default here is that the reader pays it, because that is what the
// checkout screens show and what makes the arithmetic add up. Set this false
// for a country where delivery is advertised as free, and the floor will
// absorb it instead.
export const DELIVERY_PAID_BY_READER = true;

const MAX_PASSES = 12;

// The floor is circular and has to be solved, not just added up.
//
// The retail price must cover the gateway fee. The gateway fee is a
// percentage of what the reader pays. What the reader pays depends on the
// retail price. Writing it as one sum gives the wrong answer, and writing it
// algebraically breaks as soon as a fee has a cap or a waiver, which
// Paystack's has both of.
//
// So it settles instead: guess, work out the fees that guess implies, raise
// the guess to cover them, repeat. It converges in two or three passes
// because the fees are a small fraction of the total. The loop is bounded
// anyway, and the result is checked at the end rather than trusted.
export function floorFor({
  printing,
  delivery,
  provider,
  platformFeeBps,
  deliveryPaidByReader = DELIVERY_PAID_BY_READER,
  gatewayTable = GATEWAY_FEES,
}) {
  const mustCoverDelivery = deliveryPaidByReader ? 0 : delivery;
  let retail = printing + mustCoverDelivery;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const charged = retail + (deliveryPaidByReader ? delivery : 0);
    const gateway = gatewayFee(provider, charged, gatewayTable);
    const platform = Math.ceil((retail * platformFeeBps) / 10000);
    const needed = printing + mustCoverDelivery + gateway + platform;
    if (needed <= retail) return retail;
    retail = needed;
  }

  throw new Error("The price floor did not settle: check the fee rules for a rate at or above 100%");
}

// ---------------------------------------------------------------------------
// A full quote
// ---------------------------------------------------------------------------

// Everything an order needs to know, worked out in one place so the checkout,
// the creator's pricing screen and the ledger cannot disagree.
//
// `retailMinor` is what the creator has set for the whole line (per copy
// times quantity). Pass it as null to ask only what the floor is.
export function quote({
  bands,
  rate,
  pageCount,
  quantity,
  provider,
  currency,
  platformFeeBps,
  retailMinor = null,
  deliveryPaidByReader = DELIVERY_PAID_BY_READER,
  gatewayTable = GATEWAY_FEES,
}) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a whole number of at least one");
  }

  const band = bandFor(bands, quantity);
  const printing = printingCost({ band, pageCount, quantity });
  const delivery = deliveryCost({ rate, quantity });

  const floor = floorFor({
    printing,
    delivery,
    provider,
    platformFeeBps,
    deliveryPaidByReader,
    gatewayTable,
  });

  // Nothing further to say until somebody has set a price.
  if (retailMinor === null) {
    return {
      currency,
      quantity,
      printingMinor: printing,
      deliveryMinor: delivery,
      floorMinor: floor,
      perCopyFloorMinor: Math.ceil(floor / quantity),
      trustworthy: isTrustworthy({ band, rate, provider, gatewayTable }),
      placeholders: placeholdersIn({ band, rate, provider, gatewayTable }),
    };
  }

  const belowFloor = retailMinor < floor;
  const totalMinor = retailMinor + (deliveryPaidByReader ? delivery : 0);
  const gateway = gatewayFee(provider, totalMinor, gatewayTable);
  const platform = Math.ceil((retailMinor * platformFeeBps) / 10000);

  // The creator takes what is left, rather than a figure of its own. Every
  // other share is worked out first and this one absorbs the remainder, so
  // the parts always add back to the total exactly and a rounded penny can
  // never go missing or be invented.
  const creator = totalMinor - delivery - printing - gateway - platform;

  return {
    currency,
    quantity,
    printingMinor: printing,
    deliveryMinor: delivery,
    floorMinor: floor,
    perCopyFloorMinor: Math.ceil(floor / quantity),
    retailMinor,
    totalMinor,
    gatewayFeeMinor: gateway,
    platformFeeMinor: platform,
    creatorMinor: creator,
    belowFloor,
    sellable: !belowFloor && isTrustworthy({ band, rate, provider, gatewayTable }),
    trustworthy: isTrustworthy({ band, rate, provider, gatewayTable }),
    placeholders: placeholdersIn({ band, rate, provider, gatewayTable }),
  };
}

// Which of the numbers underneath are still guesses. A quote built on any of
// them may be shown, so the admin screens have something to work with, but it
// is never sellable: a creator must not be able to put a book on sale against
// a cost nobody has quoted.
export function placeholdersIn({ band, rate, provider, gatewayTable = GATEWAY_FEES }) {
  const found = [];
  if (band?.isPlaceholder) found.push("printer cost");
  if (rate?.isPlaceholder) found.push("delivery rate");
  if (gatewayTable[provider] && !gatewayTable[provider].confirmed) found.push("gateway fee");
  return found;
}

export function isTrustworthy(parts) {
  return placeholdersIn(parts).length === 0;
}

// Why a price was refused, in words a creator reads rather than a code.
export function whyNotSellable(result) {
  if (result.sellable) return null;
  if (result.belowFloor) {
    return "This is below what the book costs to make and deliver, so every sale would lose money.";
  }
  const missing = result.placeholders;
  if (missing.length) {
    return `We cannot price this yet: the ${missing.join(" and the ")} ${
      missing.length > 1 ? "are" : "is"
    } a placeholder, not a real quote.`;
  }
  return "This price cannot be used.";
}
