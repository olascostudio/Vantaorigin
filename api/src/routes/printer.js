// The print partner's way in, and what they see once they are in.
//
// There is no open sign-up for a printer. We invite one shop at a time, by
// a link that works once, and the link is the only route to an account that
// can see a job. A printer sees buyers' addresses, because a parcel needs
// one, so the door is narrow on purpose.
//
// The flow is: an admin creates an invite and gets a link to send. The
// printer opens it, reads the agreement, and accepts, which either attaches
// their existing account to the shop or makes one. From then on they see
// their own jobs and nothing else.
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { db } from "../db/client.js";
import {
  books,
  orderEvents,
  orderItems,
  orders,
  printerInvites,
  printerUsers,
  printers,
  users,
} from "../db/schema.js";
import { authenticate, hashPassword } from "../auth/auth.js";
import { requireAdmin } from "./admin.js";
import { AGREEMENT, AGREEMENT_VERSION } from "../distribution/print-agreement.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

const INVITE_DAYS = 14;

// Which shop this person works for, if any. The answer to every "is this
// theirs" question below.
async function printerFor(userId) {
  const [row] = await db
    .select({ printer: printers })
    .from(printerUsers)
    .innerJoin(printers, eq(printers.id, printerUsers.printerId))
    .where(eq(printerUsers.userId, userId))
    .limit(1);
  return row?.printer ?? null;
}

// A job, as the shop needs to see it. Enough to print and post, and nothing
// about what anybody earned.
const asJob = (order, items) => ({
  publicId: order.publicId,
  status: order.status,
  placedAt: order.createdAt,
  buyerName: order.buyerName,
  buyerPhone: order.buyerPhone,
  address: order.address,
  region: order.region,
  countryCode: order.countryCode,
  courier: order.courier,
  trackingNumber: order.trackingNumber,
  items: items.map((item) => ({
    title: item.title,
    formatSlug: item.formatSlug,
    pageCount: item.pageCount,
    quantity: item.quantity,
  })),
});

export default async function printerRoutes(app) {
  const signedIn = { preHandler: authenticate() };

  // ---- the agreement, readable by anybody holding an invite ----

  app.get("/print/agreement", async () => AGREEMENT);

  // ---- an admin invites a shop ----

  app.post(
    "/admin/distribution/printers/:id/invite",
    { preHandler: requireAdmin() },
    async (request, reply) => {
      const body = z
        .object({ email: z.string().email() })
        .safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: "An invite needs an address to go to" });
      }

      const [printer] = await db
        .select()
        .from(printers)
        .where(eq(printers.id, request.params.id))
        .limit(1);
      if (!printer) return reply.code(404).send({ error: "No such printer" });

      const token = newToken();
      const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);

      await db.insert(printerInvites).values({
        printerId: printer.id,
        email: body.data.email,
        tokenHash: sha256(token),
        agreementVersion: AGREEMENT_VERSION,
        expiresAt,
      });

      return reply.code(201).send({
        // Returned once, here. We keep only the hash, so this is the only
        // moment the link exists in a readable form: if it is lost, the
        // invite is withdrawn and a new one sent.
        token,
        printer: { id: printer.id, name: printer.name },
        email: body.data.email,
        expiresAt,
      });
    }
  );

  app.get("/admin/distribution/printers/:id/invites", { preHandler: requireAdmin() }, async (request) => {
    const rows = await db
      .select()
      .from(printerInvites)
      .where(eq(printerInvites.printerId, request.params.id))
      .orderBy(desc(printerInvites.createdAt));

    // Never the hash. It is not useful to a person and it is the one thing
    // on the row worth stealing.
    return {
      invites: rows.map(({ tokenHash, ...rest }) => ({
        ...rest,
        state: rest.revokedAt
          ? "withdrawn"
          : rest.acceptedAt
            ? "accepted"
            : rest.expiresAt < new Date()
              ? "expired"
              : "waiting",
      })),
    };
  });

  app.post("/admin/distribution/invites/:id/revoke", { preHandler: requireAdmin() }, async (request, reply) => {
    const [updated] = await db
      .update(printerInvites)
      .set({ revokedAt: new Date() })
      .where(and(eq(printerInvites.id, request.params.id), isNull(printerInvites.acceptedAt)))
      .returning();

    if (!updated) {
      return reply.code(409).send({ error: "That invite has been used already, or does not exist" });
    }
    return { id: updated.id, revokedAt: updated.revokedAt };
  });

  // ---- the printer opens the link ----

  // What the invite is for. No account yet, so this is open, but it answers
  // only to a token nobody can guess and says nothing a stranger could use.
  app.get("/print/invite/:token", async (request, reply) => {
    const [invite] = await db
      .select({ invite: printerInvites, printer: printers })
      .from(printerInvites)
      .innerJoin(printers, eq(printers.id, printerInvites.printerId))
      .where(eq(printerInvites.tokenHash, sha256(request.params.token)))
      .limit(1);

    // One answer for a wrong token, a withdrawn invite and a used one, so
    // none of them tells somebody which they have.
    if (!invite || invite.invite.revokedAt || invite.invite.acceptedAt) {
      return reply.code(404).send({ error: "That invitation is not open" });
    }
    if (invite.invite.expiresAt < new Date()) {
      return reply.code(410).send({ error: "That invitation has expired. Ask us for a new one." });
    }

    return {
      printer: { name: invite.printer.name, countryCode: invite.printer.countryCode },
      email: invite.invite.email,
      expiresAt: invite.invite.expiresAt,
      agreement: AGREEMENT,
    };
  });

  // Accepting it: making the account, or attaching one that exists.
  //
  // required: false, because both are legitimate. Somebody already signed in
  // has their account attached; somebody with no account makes one. Without
  // this hook request.user is never set and the first case cannot happen.
  app.post(
    "/print/invite/:token/accept",
    { preHandler: authenticate({ required: false }) },
    async (request, reply) => {
    const body = z
      .object({
        agreementVersion: z.string().min(1),
        accepted: z.literal(true),
        // Only needed when there is no account yet.
        username: z.string().trim().min(2).max(40).optional(),
        password: z.string().min(8).max(200).optional(),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: "The agreement has to be accepted to continue" });
    }
    if (body.data.agreementVersion !== AGREEMENT_VERSION) {
      return reply.code(409).send({
        error: "The agreement has changed since this was shown to you. Read it again.",
        version: AGREEMENT_VERSION,
      });
    }

    const [found] = await db
      .select()
      .from(printerInvites)
      .where(eq(printerInvites.tokenHash, sha256(request.params.token)))
      .limit(1);

    if (!found || found.revokedAt || found.acceptedAt) {
      return reply.code(404).send({ error: "That invitation is not open" });
    }
    if (found.expiresAt < new Date()) {
      return reply.code(410).send({ error: "That invitation has expired. Ask us for a new one." });
    }

    // Already signed in, or an account on that address already: attach it.
    // Otherwise make one, which needs a password.
    let userId = request.user?.id ?? null;

    if (!userId) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, found.email))
        .limit(1);

      if (existing) {
        // We will not take over an account on the strength of a link. They
        // sign in first, then accept, and the branch above handles it.
        return reply.code(409).send({
          error: "There is already an account on this address. Sign in first, then open this link again.",
          needsSignIn: true,
        });
      }

      if (!body.data.username || !body.data.password) {
        return reply.code(400).send({ error: "Choose a username and a password to continue" });
      }

      const [made] = await db
        .insert(users)
        .values({
          email: found.email,
          username: `@${String(body.data.username).replace(/^@+/, "")}`,
          passwordHash: await hashPassword(body.data.password),
          // The invitation went to this address and they opened it, which is
          // the same proof a verification code gives.
          emailVerifiedAt: new Date(),
        })
        .returning();
      userId = made.id;
    }

    await db
      .insert(printerUsers)
      .values({ printerId: found.printerId, userId, agreementVersion: AGREEMENT_VERSION })
      .onConflictDoNothing();

    await db
      .update(printerInvites)
      .set({ acceptedAt: new Date(), acceptedBy: userId })
      .where(eq(printerInvites.id, found.id));

    const [printer] = await db.select().from(printers).where(eq(printers.id, found.printerId)).limit(1);

    return reply.code(201).send({
      printer: { id: printer.id, name: printer.name },
      // They still sign in to get a session. The invite proved who they are,
      // not that this browser is theirs.
      nextStep: request.user ? "portal" : "signin",
    });
    }
  );

  // ---- the portal ----

  app.get("/me/printer", signedIn, async (request, reply) => {
    const printer = await printerFor(request.user.id);
    if (!printer) return reply.code(404).send({ error: "This account does not print for us" });
    return { printer: { id: printer.id, name: printer.name, countryCode: printer.countryCode } };
  });

  // The job queue. Only orders this shop was given.
  app.get("/me/printer/orders", signedIn, async (request, reply) => {
    const printer = await printerFor(request.user.id);
    if (!printer) return reply.code(404).send({ error: "This account does not print for us" });

    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.printerId, printer.id))
      .orderBy(desc(orders.createdAt));

    if (!rows.length) return { printer: { name: printer.name }, jobs: [] };

    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, rows.map((row) => row.id)));

    const byOrder = {};
    for (const item of items) (byOrder[item.orderId] ||= []).push(item);

    return {
      printer: { name: printer.name },
      jobs: rows.map((order) => asJob(order, byOrder[order.id] ?? [])),
    };
  });

  // Moving a job along.
  //
  // Two states, not the three first written here. 0032 already has the
  // vocabulary and it does not include "accepted" or "printed": a job is
  // in_production from the moment the shop takes it until it leaves, and
  // then it is shipped. The constraint refused the invented ones, which is
  // the schema doing its job.
  app.patch("/me/printer/orders/:publicId", signedIn, async (request, reply) => {
    const printer = await printerFor(request.user.id);
    if (!printer) return reply.code(404).send({ error: "This account does not print for us" });

    const body = z
      .object({
        status: z.enum(["in_production", "shipped"]),
        courier: z.string().trim().max(120).optional(),
        trackingNumber: z.string().trim().max(120).optional(),
        note: z.string().trim().max(500).optional(),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check that update" });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.publicId, request.params.publicId), eq(orders.printerId, printer.id)))
      .limit(1);

    // Somebody else's job is not found, rather than refused.
    if (!order) return reply.code(404).send({ error: "No such job" });

    // A printer cannot move a job that has not been paid for, and cannot
    // take one back once it has shipped.
    if (order.status === "pending_payment") {
      return reply.code(409).send({ error: "This order has not been paid for yet" });
    }
    if (order.status === "delivered" || order.status === "cancelled") {
      return reply.code(409).send({ error: `This order is already ${order.status}` });
    }

    if (body.data.status === "shipped" && !body.data.trackingNumber) {
      return reply
        .code(400)
        .send({ error: "A shipped job needs a tracking number, or the buyer has nothing to follow" });
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: body.data.status,
        ...(body.data.courier ? { courier: body.data.courier } : {}),
        ...(body.data.trackingNumber ? { trackingNumber: body.data.trackingNumber } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: body.data.status,
      note: body.data.note ?? null,
      actor: "printer",
    });

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return asJob(updated, items);
  });

  // What this shop has been asked to print, as a file list. The book's own
  // files, nothing else about the book.
  app.get("/me/printer/orders/:publicId/files", signedIn, async (request, reply) => {
    const printer = await printerFor(request.user.id);
    if (!printer) return reply.code(404).send({ error: "This account does not print for us" });

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.publicId, request.params.publicId), eq(orders.printerId, printer.id)))
      .limit(1);
    if (!order) return reply.code(404).send({ error: "No such job" });

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const bookIds = items.map((item) => item.bookId).filter(Boolean);
    if (!bookIds.length) return { files: [] };

    const titles = await db.select().from(books).where(inArray(books.id, bookIds));

    return {
      files: titles.map((title) => ({
        bookTitle: title.title,
        formatSlug: title.formatSlug,
        pageCount: title.pageCount,
        // The print ready file itself is not uploaded yet, so this says so
        // rather than handing back an address that answers nothing.
        ready: false,
        note: "The print file is not in the system yet. We will send it with the job.",
      })),
    };
  });
}
