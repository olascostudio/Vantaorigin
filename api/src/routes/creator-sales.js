// What a creator has sold, and what they are owed.
//
// The ledger has been written correctly since the first order and read by
// nothing. Four parties are recorded the moment an order is placed, the
// creator's share among them, and there has never been a route that gave a
// creator their own rows back. So the dashboard had numbers it could not
// fetch and the orders screen had nothing behind it at all.
//
// Everything here is scoped by the creator's own books. A creator sees the
// orders that contain their work and their own line of the split, never
// another creator's, and never the printer's cost or the platform's cut:
// those are not theirs to see on this screen.
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import { books, ledgerEntries, orderItems, orders } from "../db/schema.js";
import { requireStudio } from "./studio.js";

// An order is "settled" once it is delivered and past dispute. Until then a
// creator's share exists and is not theirs to spend, which is why the
// dashboard says held rather than available.
const SETTLED = new Set(["completed", "refunded", "cancelled"]);
const DONE = new Set(["completed", "refunded", "cancelled", "shipped"]);

// Every order that contains one of this creator's books, with their own
// share of each. One pass, because a per-order query inside a loop is how a
// list of thirty orders becomes ninety round trips.
async function salesFor(userId) {
  const mine = await db.select().from(books).where(eq(books.creatorId, userId));

  // Straight off the line item, which carries the creator it was sold for.
  // Going via the book list would give the same answer today and the wrong
  // one the moment a book changes hands: an order belongs to whoever sold
  // it, not to whoever owns the book now.
  const items = await db.select().from(orderItems).where(eq(orderItems.creatorId, userId));
  if (!items.length) return { books: mine, rows: [] };

  const orderIds = [...new Set(items.map((item) => item.orderId))];
  const [found, entries] = await Promise.all([
    db.select().from(orders).where(inArray(orders.id, orderIds)),
    db
      .select()
      .from(ledgerEntries)
      .where(
        and(eq(ledgerEntries.party, "creator"), eq(ledgerEntries.partyUserId, userId))
      ),
  ]);

  const shareByOrder = new Map();
  for (const entry of entries) {
    // Summed rather than taken, because a correction is a second entry
    // against the same order and not an edit to the first.
    shareByOrder.set(entry.orderId, (shareByOrder.get(entry.orderId) ?? 0) + Number(entry.amountMinor));
  }

  const titleByBook = new Map(mine.map((book) => [book.id, book.title]));

  const rows = found
    .map((order) => ({
      publicId: order.publicId,
      status: order.status,
      countryCode: order.countryCode,
      currency: order.currency,
      placedAt: order.createdAt,
      titles: items
        .filter((item) => item.orderId === order.id)
        .map((item) => titleByBook.get(item.bookId) ?? item.title),
      quantity: items
        .filter((item) => item.orderId === order.id)
        .reduce((sum, item) => sum + Number(item.quantity ?? 1), 0),
      yourShareMinor: shareByOrder.get(order.id) ?? 0,
    }))
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

  return { books: mine, rows };
}

export default async function creatorSalesRoutes(app) {
  const signedIn = { preHandler: requireStudio() };

  // The four figures across the top of the dashboard.
  app.get("/me/studio/summary", signedIn, async (request) => {
    const { books: mine, rows } = await salesFor(request.user.id);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = rows.filter((row) => new Date(row.placedAt) >= monthStart);
    const awaiting = rows.filter((row) => !DONE.has(row.status));
    const held = rows.filter((row) => !SETTLED.has(row.status));

    return {
      booksPublished: mine.filter((book) => book.status === "on_sale").length,
      booksTotal: mine.length,
      ordersThisMonth: thisMonth.length,
      awaitingFulfilment: awaiting.length,
      // One currency per order, and a creator may sell in several. Summed
      // per currency rather than added together, because adding naira to
      // pounds produces a number that is true of nothing.
      heldMinor: held.reduce((byCurrency, row) => {
        byCurrency[row.currency] = (byCurrency[row.currency] ?? 0) + row.yourShareMinor;
        return byCurrency;
      }, {}),
      recent: rows.slice(0, 5),
    };
  });

  // The orders screen: all of them, newest first.
  app.get("/me/studio/orders", signedIn, async (request) => {
    const { rows } = await salesFor(request.user.id);
    return { orders: rows };
  });
}
