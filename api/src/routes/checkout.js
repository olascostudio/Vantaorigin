// Buying a printed copy.
//
// A reader needs no account: they are here because somebody shared a link,
// and asking them to sign up before they can pay for a book is how you lose
// the sale. They get a status token instead, which is the only thing that
// opens their order afterwards.
//
// Nothing is charged here. The order is written, its money is frozen, and it
// waits at pending_payment for a provider that is not connected yet. That is
// deliberate: the shape of an order is worth getting right before anybody's
// card is involved, and every figure on it is already decided by the engine.
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { db } from "../db/client.js";
import {
  bookFormats,
  bookPrices,
  books,
  countries,
  deliveryRates,
  distributionSettings,
  ledgerEntries,
  orderEvents,
  orderItems,
  orders,
  printerCosts,
  users,
} from "../db/schema.js";
import { bandFor, quote } from "../distribution/pricing.js";

const newPublicId = () => randomBytes(9).toString("base64url");
// Longer than the order's own id, because this is the thing that opens it.
const newStatusToken = () => randomBytes(32).toString("base64url");

const MAX_COPIES = 20;

// What it costs to send this order, and what each part of it is worth, taken
// from the live tables at the moment of ordering and then never read again.
async function priceOrder({ book, place, quantity }) {
  const [bands, rates, settings, [price]] = await Promise.all([
    db.select().from(printerCosts).where(eq(printerCosts.formatSlug, book.formatSlug)),
    db.select().from(deliveryRates).where(eq(deliveryRates.countryCode, place.code)),
    db
      .select()
      .from(distributionSettings)
      .where(eq(distributionSettings.key, "platform_fee_bps"))
      .limit(1),
    db
      .select()
      .from(bookPrices)
      .where(and(eq(bookPrices.bookId, book.id), eq(bookPrices.countryCode, place.code)))
      .limit(1),
  ]);

  if (!price) return { problem: `This book is not on sale in ${place.name}` };

  const rate = rates.find((row) => !row.region) ?? rates[0] ?? null;
  if (!bands.length) return { problem: `No printer has quoted for ${book.formatSlug} yet` };
  if (!rate) return { problem: `We cannot deliver to ${place.name} yet` };

  const answer = quote({
    bands,
    rate,
    pageCount: book.pageCount,
    quantity,
    provider: place.paymentProvider,
    currency: place.currency,
    platformFeeBps: Number(settings[0]?.value ?? 1000),
    // The price the creator set, for every copy.
    retailMinor: price.retailMinor * quantity,
  });

  // A book priced above the floor can still be unsellable, because a cost
  // under it may be a guess nobody has confirmed. The creator is told this
  // when they price it; the reader must not be able to buy through it.
  if (!answer.sellable) {
    return {
      problem: answer.placeholders?.length
        ? "This book is not on sale yet: we are still confirming what it costs to print and deliver."
        : "This book is not on sale yet.",
    };
  }

  return { price, quote: answer, band: bandFor(bands, quantity), rate };
}

export default async function checkoutRoutes(app) {
  // The book as somebody who might buy it sees it.
  app.get("/public/books/:publicId", async (request, reply) => {
    const [row] = await db
      .select({ book: books, creator: users })
      .from(books)
      .innerJoin(users, eq(users.id, books.creatorId))
      .where(eq(books.publicId, request.params.publicId))
      .limit(1);

    if (!row || row.book.status === "draft") {
      return reply.code(404).send({ error: "No such book" });
    }

    const [format] = await db
      .select()
      .from(bookFormats)
      .where(eq(bookFormats.slug, row.book.formatSlug))
      .limit(1);

    const places = await db.select().from(countries).where(eq(countries.enabled, true));

    // What it would cost, per country, for one copy. The screen needs this to
    // say a price before anybody has said where they are.
    const options = await Promise.all(
      places.map(async (place) => {
        const priced = await priceOrder({ book: row.book, place, quantity: 1 });
        if (priced.problem) {
          return { countryCode: place.code, name: place.name, available: false, why: priced.problem };
        }
        return {
          countryCode: place.code,
          name: place.name,
          currency: place.currency,
          available: true,
          retailMinor: priced.price.retailMinor,
          deliveryMinor: priced.quote.deliveryMinor,
          totalMinor: priced.quote.totalMinor,
          // From the delivery rate, which is where they live. The quote is
          // about money and says nothing about time.
          estDaysMin: priced.rate.estDaysMin,
          estDaysMax: priced.rate.estDaysMax,
          courier: priced.rate.courier,
        };
      })
    );

    return {
      publicId: row.book.publicId,
      title: row.book.title,
      description: row.book.description,
      coverImageUrl: row.book.coverImageUrl,
      pageCount: row.book.pageCount,
      format: format ? { slug: format.slug, name: format.name } : null,
      creator: { username: row.creator.username, name: row.creator.firstName || row.creator.username },
      countries: options,
      maxCopies: MAX_COPIES,
    };
  });

  // What this exact order would come to, before the buyer commits to it.
  app.post("/checkout/quote", async (request, reply) => {
    const body = z
      .object({
        bookId: z.string().min(1),
        countryCode: z.string().length(2),
        quantity: z.coerce.number().int().min(1).max(MAX_COPIES),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check that order" });
    }

    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.publicId, body.data.bookId))
      .limit(1);
    if (!book || book.status === "draft") return reply.code(404).send({ error: "No such book" });

    const [place] = await db
      .select()
      .from(countries)
      .where(and(eq(countries.code, body.data.countryCode), eq(countries.enabled, true)))
      .limit(1);
    if (!place) return reply.code(409).send({ error: "We do not deliver there yet" });

    const priced = await priceOrder({ book, place, quantity: body.data.quantity });
    if (priced.problem) return reply.code(409).send({ error: priced.problem });

    return {
      quantity: body.data.quantity,
      currency: place.currency,
      unitRetailMinor: priced.price.retailMinor,
      retailMinor: priced.quote.retailMinor,
      deliveryMinor: priced.quote.deliveryMinor,
      totalMinor: priced.quote.totalMinor,
    };
  });

  // Placing it.
  app.post("/orders", async (request, reply) => {
    const body = z
      .object({
        bookId: z.string().min(1),
        countryCode: z.string().length(2),
        quantity: z.coerce.number().int().min(1).max(MAX_COPIES),
        buyerName: z.string().trim().min(1).max(120),
        buyerEmail: z.string().email(),
        buyerPhone: z.string().trim().max(40).optional(),
        region: z.string().trim().max(120).optional(),
        address: z.object({
          line1: z.string().trim().min(1).max(200),
          line2: z.string().trim().max(200).optional(),
          city: z.string().trim().min(1).max(120),
          postcode: z.string().trim().max(40).optional(),
        }),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those details" });
    }

    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.publicId, body.data.bookId))
      .limit(1);
    if (!book || book.status === "draft") return reply.code(404).send({ error: "No such book" });

    const [place] = await db
      .select()
      .from(countries)
      .where(and(eq(countries.code, body.data.countryCode), eq(countries.enabled, true)))
      .limit(1);
    if (!place) return reply.code(409).send({ error: "We do not deliver there yet" });

    const priced = await priceOrder({ book, place, quantity: body.data.quantity });
    if (priced.problem) return reply.code(409).send({ error: priced.problem });

    const { quote: q, band } = priced;
    const statusToken = newStatusToken();

    const [order] = await db
      .insert(orders)
      .values({
        publicId: newPublicId(),
        statusToken,
        countryCode: place.code,
        currency: place.currency,
        buyerName: body.data.buyerName,
        buyerEmail: body.data.buyerEmail,
        buyerPhone: body.data.buyerPhone ?? null,
        address: body.data.address,
        region: body.data.region ?? null,
        // Frozen. A cost table edited tomorrow must not change what somebody
        // agreed to today.
        retailMinor: q.retailMinor,
        deliveryMinor: q.deliveryMinor,
        gatewayFeeMinor: q.gatewayFeeMinor,
        platformFeeMinor: q.platformFeeMinor,
        printerCostMinor: q.printingMinor,
        totalMinor: q.totalMinor,
        paymentProvider: place.paymentProvider,
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: order.id,
      bookId: book.id,
      quantity: body.data.quantity,
      unitRetailMinor: priced.price.retailMinor,
      unitPrinterCostMinor: band?.unitCostMinor ?? 0,
      title: book.title,
      formatSlug: book.formatSlug,
      pageCount: book.pageCount,
      creatorId: book.creatorId,
    });

    // Who is owed what, written down at the moment it is decided.
    //
    // Four parties, not five. The gateway is not one of them: its cut comes
    // off on the way in and never reaches our account, so there is nobody to
    // pay and nothing to hold. 0032 says so, allowing only creator, printer,
    // courier and platform, and its constraint caught an earlier version of
    // this that tried to book the gateway as a party and to invent two kinds
    // of entry the column does not have.
    //
    // So these account for the total LESS the gateway fee, which is the money
    // that actually arrives. A test holds that sum, because "who is owed
    // what" has no answer if the entries do not add up to what came in.
    await db.insert(ledgerEntries).values([
      { orderId: order.id, party: "printer", amountMinor: q.printingMinor, currency: place.currency },
      { orderId: order.id, party: "courier", amountMinor: q.deliveryMinor, currency: place.currency },
      { orderId: order.id, party: "platform", amountMinor: q.platformFeeMinor, currency: place.currency },
      {
        orderId: order.id,
        party: "creator",
        partyUserId: book.creatorId,
        kind: "earning",
        amountMinor: q.creatorMinor,
        currency: place.currency,
      },
    ]);

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: order.status,
      note: `${body.data.quantity} copy of ${book.title}`,
    });

    return reply.code(201).send({
      publicId: order.publicId,
      // The only thing that opens this order again. Returned once, here,
      // because a buyer with no account has nothing else to prove it is
      // theirs, and it goes in the link we email them.
      statusToken,
      status: order.status,
      currency: order.currency,
      retailMinor: order.retailMinor,
      deliveryMinor: order.deliveryMinor,
      totalMinor: order.totalMinor,
      nextStep: "payment",
    });
  });

  // Looking at it afterwards, with the token and nothing else.
  app.get("/orders/:publicId", async (request, reply) => {
    const token = String(request.query.token || "");
    if (!token) return reply.code(404).send({ error: "No such order" });

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.publicId, request.params.publicId), eq(orders.statusToken, token)))
      .limit(1);

    // The same answer for a wrong token and a missing order, so neither
    // tells somebody which of the two they got.
    if (!order) return reply.code(404).send({ error: "No such order" });

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    return {
      publicId: order.publicId,
      status: order.status,
      currency: order.currency,
      retailMinor: order.retailMinor,
      deliveryMinor: order.deliveryMinor,
      totalMinor: order.totalMinor,
      courier: order.courier,
      trackingNumber: order.trackingNumber,
      deliveredAt: order.deliveredAt,
      placedAt: order.createdAt,
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        formatSlug: item.formatSlug,
      })),
    };
  });
}
