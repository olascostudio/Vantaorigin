// A creator's books: making one, pricing it, and finding out what it earns.
//
// Everything under Distribution so far has been the half that belongs to us:
// the schema, the engine that works out a floor, and the admin screen where a
// printer's quote gets typed in. None of it could be used, because nothing
// created a book. Seventeen tables and a tested pricing engine, and no way
// for a creator to make the thing they are all about.
//
// So this is the creator's side. A book is a title, a format and a page
// count. It is a draft until it has a price that covers its costs and a
// signed warranty that the work is theirs to sell, and it cannot go on sale
// while any cost under it is still a guess, which is the rule the engine
// already enforces and this refuses to work around.
import { and, asc, desc, eq } from "drizzle-orm";
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
  printerCosts,
} from "../db/schema.js";
import { requireStudio } from "./studio.js";
import { quote } from "../distribution/pricing.js";

// Short, unguessable, and readable aloud. It appears in the address of a
// book's public page, so it is not the primary key and not a number anybody
// can count up from to find somebody else's draft.
const newPublicId = () => randomBytes(9).toString("base64url");

// The warranty a creator signs before a book can be sold: that the work is
// theirs, and that selling it is theirs to allow. Versioned, because if the
// wording changes the old acceptance no longer says what the new one says
// and everybody has to be asked again.
export const RIGHTS_WARRANTY_VERSION = "2026-11-24";

const bookBody = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  formatSlug: z.string().min(1),
  pageCount: z.coerce.number().int().min(1).max(2000),
  coverImageUrl: z.string().url().nullish(),
});

// The page count has to suit the format: a sixteen page comic cannot be
// saddle stitched at four hundred pages, and a printer will refuse the job
// rather than guess. 0032 wanted this as a database trigger and could not
// have one, because the migration runner cannot take a dollar quoted plpgsql
// body, so 0033 wrote it down as a thing the app must do. This is the app
// doing it. Without it the check exists in a comment and nowhere else.
const fitsFormat = (format, pageCount) => {
  if (pageCount < format.minPages) {
    return `${format.name} starts at ${format.minPages} pages. This one has ${pageCount}.`;
  }
  if (pageCount > format.maxPages) {
    return `${format.name} stops at ${format.maxPages} pages. This one has ${pageCount}.`;
  }
  // A saddle stitched book is folded down the middle, so its pages come four
  // at a time. The printer cannot make half a sheet.
  if (format.binding === "saddle" && pageCount % 4 !== 0) {
    return `A saddle stitched book is folded in the middle, so its page count has to divide by four. ${pageCount} does not.`;
  }
  return null;
};

const mine = async (publicId, userId) => {
  const [book] = await db
    .select()
    .from(books)
    .where(and(eq(books.publicId, publicId), eq(books.creatorId, userId)))
    .limit(1);
  return book ?? null;
};

// What this book costs and earns in one country, straight from the engine
// the checkout will use. Returns null where there is nothing to work it out
// from, which is a fact about our data rather than about the book.
async function priceFor({ book, place, retailMinor = null }) {
  const [bands, rates, fee] = await Promise.all([
    db.select().from(printerCosts).where(eq(printerCosts.formatSlug, book.formatSlug)),
    db.select().from(deliveryRates).where(eq(deliveryRates.countryCode, place.code)),
    db
      .select()
      .from(distributionSettings)
      .where(eq(distributionSettings.key, "platform_fee_bps"))
      .limit(1),
  ]);

  const rate = rates.find((row) => !row.region) ?? rates[0] ?? null;
  if (!bands.length || !rate) {
    return {
      countryCode: place.code,
      currency: place.currency,
      unavailable: !bands.length
        ? `No printer has quoted for ${book.formatSlug} yet`
        : `No delivery rate for ${place.code} yet`,
    };
  }

  try {
    return {
      countryCode: place.code,
      ...quote({
        bands,
        rate,
        pageCount: book.pageCount,
        quantity: 1,
        provider: place.paymentProvider,
        currency: place.currency,
        platformFeeBps: Number(fee[0]?.value ?? 1000),
        retailMinor,
      }),
    };
  } catch (error) {
    return { countryCode: place.code, currency: place.currency, unavailable: error.message };
  }
}

export default async function bookRoutes(app) {
  // Studio members and admins, not every signed in account: Distribution is
  // not open, and a book made by somebody who was never invited is a book
  // nobody has talked to about printing.
  const signedIn = { preHandler: requireStudio() };

  // Everything this creator has made, newest first, with what each one is
  // priced at. The list is the screen, so it carries enough to draw it.
  app.get("/me/books", signedIn, async (request) => {
    const rows = await db
      .select()
      .from(books)
      .where(eq(books.creatorId, request.user.id))
      .orderBy(desc(books.createdAt));

    if (!rows.length) return { books: [] };

    const prices = await db.select().from(bookPrices);
    const byBook = {};
    for (const price of prices) (byBook[price.bookId] ||= []).push(price);

    return {
      books: rows.map((book) => ({
        ...book,
        prices: byBook[book.id] ?? [],
        rightsAccepted: Boolean(book.rightsWarrantyAcceptedAt),
      })),
    };
  });

  app.get("/me/books/formats", signedIn, async () => ({
    formats: await db.select().from(bookFormats).orderBy(asc(bookFormats.position)),
    // Only the countries we can actually sell into. A creator choosing from a
    // list that includes somewhere we cannot deliver to is being set up.
    countries: await db.select().from(countries).where(eq(countries.enabled, true)),
  }));

  app.post("/me/books", signedIn, async (request, reply) => {
    const body = bookBody.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those details" });
    }

    const [format] = await db
      .select()
      .from(bookFormats)
      .where(eq(bookFormats.slug, body.data.formatSlug))
      .limit(1);
    if (!format) return reply.code(404).send({ error: `We have no format ${body.data.formatSlug}` });

    const wrong = fitsFormat(format, body.data.pageCount);
    if (wrong) return reply.code(400).send({ error: wrong });

    const [made] = await db
      .insert(books)
      .values({ ...body.data, creatorId: request.user.id, publicId: newPublicId() })
      .returning();

    return reply.code(201).send({ ...made, prices: [], rightsAccepted: false });
  });

  app.get("/me/books/:publicId", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    const prices = await db.select().from(bookPrices).where(eq(bookPrices.bookId, book.id));
    return { ...book, prices, rightsAccepted: Boolean(book.rightsWarrantyAcceptedAt) };
  });

  app.patch("/me/books/:publicId", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    const body = bookBody.partial().safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those details" });
    }

    const formatSlug = body.data.formatSlug ?? book.formatSlug;
    const pageCount = body.data.pageCount ?? book.pageCount;

    const [format] = await db
      .select()
      .from(bookFormats)
      .where(eq(bookFormats.slug, formatSlug))
      .limit(1);
    if (!format) return reply.code(404).send({ error: `We have no format ${formatSlug}` });

    const wrong = fitsFormat(format, pageCount);
    if (wrong) return reply.code(400).send({ error: wrong });

    // Changing the shape of a book changes what it costs to print, so a price
    // agreed against the old shape is no longer a price anybody checked. It
    // goes, and the creator sets it again against the new numbers.
    const reshaped = formatSlug !== book.formatSlug || pageCount !== book.pageCount;
    if (reshaped) await db.delete(bookPrices).where(eq(bookPrices.bookId, book.id));

    const [updated] = await db
      .update(books)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(books.id, book.id))
      .returning();

    const prices = reshaped
      ? []
      : await db.select().from(bookPrices).where(eq(bookPrices.bookId, book.id));

    return {
      ...updated,
      prices,
      rightsAccepted: Boolean(updated.rightsWarrantyAcceptedAt),
      pricesCleared: reshaped,
    };
  });

  app.delete("/me/books/:publicId", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    // A book somebody has bought is not the creator's to erase: the order
    // refers to it, and a buyer asking what they bought deserves an answer.
    if (book.status !== "draft") {
      return reply
        .code(409)
        .send({ error: "This book has been published. Take it off sale instead of deleting it." });
    }

    await db.delete(bookPrices).where(eq(bookPrices.bookId, book.id));
    await db.delete(books).where(eq(books.id, book.id));
    return reply.code(204).send();
  });

  // What it would cost and earn, everywhere we sell, before anybody commits
  // to a price. The question a creator actually has.
  app.get("/me/books/:publicId/quote", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    const places = await db.select().from(countries).where(eq(countries.enabled, true));
    const asked = Number(request.query.retailMinor);
    const retailMinor = Number.isInteger(asked) && asked >= 0 ? asked : null;

    return {
      book: { publicId: book.publicId, title: book.title, formatSlug: book.formatSlug, pageCount: book.pageCount },
      countries: await Promise.all(places.map((place) => priceFor({ book, place, retailMinor }))),
    };
  });

  // Setting a price, which is the moment the engine stops being advice.
  app.put("/me/books/:publicId/price", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    const body = z
      .object({
        countryCode: z.string().length(2),
        // Whole minor units as a string, the same shape the admin screen
        // sends, because a JSON number is a float and these are kobo.
        retailMinor: z
          .string()
          .trim()
          .regex(/^\d{1,15}$/, "Give a price in whole kobo or pence, digits only")
          .transform(Number),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check that price" });
    }

    const [place] = await db
      .select()
      .from(countries)
      .where(eq(countries.code, body.data.countryCode))
      .limit(1);
    if (!place) return reply.code(404).send({ error: `We have no country ${body.data.countryCode}` });
    if (!place.enabled) {
      return reply.code(409).send({ error: `${place.name} is not open for selling yet` });
    }

    const priced = await priceFor({ book, place, retailMinor: body.data.retailMinor });
    if (priced.unavailable) return reply.code(409).send({ error: priced.unavailable });

    // The two refusals that matter, and they are not the same question.
    //
    // Below the floor is arithmetic: the price does not cover what the book
    // costs to make and move. Losing money is measured rather than deduced,
    // because the fees do not rise smoothly and there is a window above the
    // floor where a tidy round price still leaves the creator short.
    if (priced.belowFloor || priced.losesMoney) {
      return reply.code(409).send({
        error: `That price does not cover what this book costs. The lowest it can sell for in ${place.name} is ${priced.floorMinor} ${place.currency} in minor units.`,
        floorMinor: priced.floorMinor,
        currency: place.currency,
      });
    }

    const [saved] = await db
      .insert(bookPrices)
      .values({
        bookId: book.id,
        countryCode: place.code,
        retailMinor: body.data.retailMinor,
        currency: place.currency,
        updatedAt: new Date(),
      })
      .returning();

    return reply.code(201).send({
      ...saved,
      // Said plainly, because a saved price is not the same as a sellable
      // book: a cost nobody has quoted keeps it off sale however good the
      // price is, and the creator should hear that from us rather than
      // wonder why nothing happens.
      sellable: priced.sellable,
      waitingOn: priced.placeholders ?? [],
      creatorKeepsMinor: priced.creatorMinor,
    });
  });

  // The warranty. A book cannot be sold until somebody has said, in a way we
  // recorded, that the work is theirs to sell.
  app.post("/me/books/:publicId/rights", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    const body = z
      .object({ accepted: z.literal(true), version: z.string().min(1) })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply
        .code(400)
        .send({ error: "The rights warranty has to be accepted, and its version named." });
    }
    if (body.data.version !== RIGHTS_WARRANTY_VERSION) {
      return reply.code(409).send({
        error: "The warranty has changed since this was shown to you. Read it again.",
        version: RIGHTS_WARRANTY_VERSION,
      });
    }

    const [updated] = await db
      .update(books)
      .set({
        rightsWarrantyAcceptedAt: new Date(),
        rightsWarrantyVersion: RIGHTS_WARRANTY_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(books.id, book.id))
      .returning();

    return { ...updated, rightsAccepted: true };
  });
  // Putting it on sale, and taking it off.
  //
  // The step that did not exist. A book could be made, priced and signed for
  // and then had nowhere to go: nothing moved it out of draft, so the only
  // book on sale anywhere got there by hand in SQL. Drawing the creator flow
  // out as a sequence is what made the hole obvious.
  //
  // Both conditions are checked here rather than trusted from the screen.
  // A price that covers costs and a signed warranty are the two things
  // standing between us and selling somebody else work at a loss.
  app.post("/me/books/:publicId/publish", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    if (!book.rightsWarrantyAcceptedAt) {
      return reply
        .code(409)
        .send({ error: "Tell us the work is yours to sell before it goes on sale." });
    }

    const prices = await db.select().from(bookPrices).where(eq(bookPrices.bookId, book.id));
    if (!prices.length) {
      return reply.code(409).send({ error: "Set a price in at least one country first." });
    }

    // Still priced above cost today. A price saved last week against a
    // printer quote that has since gone up is not a price we can sell at.
    const places = await db.select().from(countries).where(eq(countries.enabled, true));
    const checks = await Promise.all(
      prices.map(async (price) => {
        const place = places.find((row) => row.code === price.countryCode);
        if (!place) return { code: price.countryCode, problem: "not open for selling" };
        const priced = await priceFor({ book, place, retailMinor: price.retailMinor });
        if (priced.unavailable) return { code: place.code, problem: priced.unavailable };
        if (priced.belowFloor || priced.losesMoney) {
          return { code: place.code, problem: "no longer covers what the book costs" };
        }
        return null;
      })
    );

    const wrong = checks.filter(Boolean);
    if (wrong.length) {
      return reply.code(409).send({
        error: `Not ready: ${wrong.map((row) => `${row.code} ${row.problem}`).join(", ")}.`,
      });
    }

    const [updated] = await db
      .update(books)
      .set({ status: "on_sale", updatedAt: new Date() })
      .where(eq(books.id, book.id))
      .returning();

    return { ...updated, prices, rightsAccepted: true };
  });

  app.post("/me/books/:publicId/unpublish", signedIn, async (request, reply) => {
    const book = await mine(request.params.publicId, request.user.id);
    if (!book) return reply.code(404).send({ error: "No such book" });

    const [updated] = await db
      .update(books)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(books.id, book.id))
      .returning();

    const prices = await db.select().from(bookPrices).where(eq(bookPrices.bookId, book.id));
    // Orders already placed are untouched: somebody who bought it still
    // gets it. Taking a book off sale stops the next sale, not the last one.
    return { ...updated, prices, rightsAccepted: Boolean(updated.rightsWarrantyAcceptedAt) };
  });
}
