// The way back for an address we stopped writing to.
//
// The webhook endpoint fills the suppression list by itself and never
// empties it. That is right for the common case -- a mailbox that no longer
// exists is not going to start existing -- but it is wrong for the cases
// that actually turn up:
//
//   A mail server having a bad hour and answering a permanent refusal it
//   did not mean. A corporate filter reporting a newsletter as spam on
//   somebody's behalf. A person who pressed the wrong thing and wrote in to
//   say so.
//
// Without this, every one of those is cut off for good, silently, with no
// sign of it anywhere in the product and no way back short of opening a SQL
// console. Being on this list means not even a password reset arrives, so
// being on it wrongly means losing the account.
//
// Lifting one is written to the log with who did it, because taking an
// address off this list is a decision to resume writing to somebody, and
// that should be answerable later.
import { z } from "zod";
import { desc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { suppressionLifts, suppressionList, webhookEvents } from "../db/schema.js";
import { requireAdmin } from "./admin.js";

const lifting = z.object({
  email: z.string().min(3).max(320),
  // Why it is being lifted, in the admin's own words. Not optional: the
  // whole point of the record is that somebody can read it later and know
  // what was being thought at the time.
  note: z.string().min(1).max(300),
});

export default async function suppressionRoutes(app) {
  // Everything we have stopped writing to, newest first, with enough beside
  // each one to decide without going anywhere else.
  app.get("/admin/suppressions", { preHandler: requireAdmin() }, async (request) => {
    const q = String(request.query.q || "").trim().toLowerCase();
    const limit = Math.min(Number(request.query.limit) || 100, 500);

    const rows = await db
      .select()
      .from(suppressionList)
      .where(q ? sql`lower(${suppressionList.email}) LIKE ${`%${q}%`}` : sql`true`)
      .orderBy(desc(suppressionList.createdAt))
      .limit(limit);

    // What the sender actually said, for the ones that came from a bounce.
    // An admin deciding whether a permanent bounce was really permanent
    // needs the diagnostic line, not our summary of it.
    const detailed = await Promise.all(
      rows.map(async (row) => {
        const [last] = await db
          .select({
            type: webhookEvents.eventType,
            at: webhookEvents.receivedAt,
            payload: webhookEvents.payload,
          })
          .from(webhookEvents)
          .where(sql`lower(${webhookEvents.email}) = ${row.email.toLowerCase()}`)
          .orderBy(desc(webhookEvents.receivedAt))
          .limit(1);

        const bounce = last?.payload?.data?.bounce ?? null;
        return {
          ...row,
          lastEvent: last ? { type: last.type, at: last.at } : null,
          bounceType: bounce?.type ?? null,
          bounceSubType: bounce?.subType ?? null,
          diagnostic: String(bounce?.diagnosticCode || bounce?.message || "").slice(0, 400) || null,
        };
      })
    );

    const [counted] = await db
      .select({ value: sql`count(*)::int` })
      .from(suppressionList);

    const lifts = await db
      .select()
      .from(suppressionLifts)
      .orderBy(desc(suppressionLifts.liftedAt))
      .limit(50);

    return { suppressions: detailed, total: Number(counted?.value ?? 0), lifts };
  });

  // Lift one. Takes the address rather than the id, because the admin is
  // acting on an address they were given -- somebody wrote in -- and making
  // them find a row id first is a step that only invites picking the wrong
  // row.
  app.delete("/admin/suppressions", { preHandler: requireAdmin() }, async (request, reply) => {
    const parsed = lifting.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "An address and a reason are both needed" });
    }

    const address = parsed.data.email.trim().toLowerCase();

    const [gone] = await db
      .delete(suppressionList)
      .where(sql`lower(${suppressionList.email}) = ${address}`)
      .returning();

    if (!gone) return reply.code(404).send({ error: "That address is not suppressed" });

    // The deleted row's own facts, copied before they are gone. Without
    // this the lift leaves no trace of itself at all: the suppression row
    // is what recorded the bounce, and lifting removes it.
    await db.insert(suppressionLifts).values({
      email: address,
      wasReason: gone.reason,
      wasNote: gone.note ?? "",
      wasSuppressedAt: gone.createdAt ?? null,
      liftedBy: request.user.email,
      note: parsed.data.note,
    });

    request.log.warn(
      { email: address, by: request.user.email, was: gone.reason, note: parsed.data.note },
      "suppression lifted"
    );

    return { ok: true, email: address, was: gone.reason };
  });
}
