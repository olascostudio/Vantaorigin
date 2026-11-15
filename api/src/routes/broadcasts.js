// Writing and sending something to everybody at once.
//
// Admin only, and every step is deliberately slower than the newsletter's.
// A newsletter goes to people who asked for it; this goes to people who
// cannot refuse it, which is a thing worth being made to think about: a
// reason has to be chosen, the audience size is shown and has to be agreed
// to, and the row keeps who did it.
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { broadcasts, termsVersions } from "../db/schema.js";
import { requireAdmin } from "./admin.js";
import { mailer } from "../adapters/email.js";
import { renderIssue } from "../emails/issue.js";
import { REASON_CATEGORIES, SERVICE_ANNOUNCEMENT, isUnavoidable } from "../email-classes.js";
import { countAudience, countWaiting, deliver, isSending, whyNotSendable } from "../broadcast-send.js";

const block = z.object({ type: z.string().max(40) }).passthrough();

const writing = z.object({
  subject: z.string().max(200).optional(),
  blocks: z.array(block).max(200).optional(),
  reasonCategory: z.enum(REASON_CATEGORIES).nullable().optional(),
  termsVersion: z.string().max(40).nullable().optional(),
});

export default async function broadcastRoutes(app) {
  app.get("/admin/broadcasts", { preHandler: requireAdmin() }, async () => {
    const rows = await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt)).limit(50);
    const versions = await db
      .select({ version: termsVersions.version, effectiveDate: termsVersions.effectiveDate })
      .from(termsVersions)
      .orderBy(desc(termsVersions.effectiveDate))
      .limit(20);

    return { broadcasts: rows, reasons: REASON_CATEGORIES, termsVersions: versions };
  });

  app.get("/admin/broadcasts/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, request.params.id));
    if (!row) return reply.code(404).send({ error: "No such announcement" });
    return { ...row, sending: isSending(row.id) };
  });

  app.post("/admin/broadcasts", { preHandler: requireAdmin() }, async (request, reply) => {
    const parsed = writing.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "Check the fields and try again" });

    const [row] = await db
      .insert(broadcasts)
      .values({
        class: SERVICE_ANNOUNCEMENT,
        subject: parsed.data.subject ?? "",
        blocks: parsed.data.blocks ?? [],
        reasonCategory: parsed.data.reasonCategory ?? null,
        termsVersion: parsed.data.termsVersion ?? null,
        // Written down at the moment it is made, not worked out later.
        createdBy: request.user.id,
        createdByEmail: request.user.email,
      })
      .returning();

    return row;
  });

  app.patch("/admin/broadcasts/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const parsed = writing.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "Check the fields and try again" });

    const [existing] = await db.select().from(broadcasts).where(eq(broadcasts.id, request.params.id));
    if (!existing) return reply.code(404).send({ error: "No such announcement" });
    if (existing.status !== "draft") {
      // Changing what was said after it was said would leave the record
      // describing a letter nobody received.
      return reply.code(409).send({ error: "This has already gone out and cannot be edited." });
    }

    const [row] = await db
      .update(broadcasts)
      .set({
        ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
        ...(parsed.data.blocks !== undefined ? { blocks: parsed.data.blocks } : {}),
        ...(parsed.data.reasonCategory !== undefined
          ? { reasonCategory: parsed.data.reasonCategory }
          : {}),
        ...(parsed.data.termsVersion !== undefined
          ? { termsVersion: parsed.data.termsVersion }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(broadcasts.id, request.params.id))
      .returning();

    return row;
  });

  app.delete("/admin/broadcasts/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const [existing] = await db.select().from(broadcasts).where(eq(broadcasts.id, request.params.id));
    if (!existing) return reply.code(404).send({ error: "No such announcement" });
    if (existing.status !== "draft") {
      // The sent ones are the audit. Deleting one would be deleting the
      // evidence that it was sent.
      return reply.code(409).send({ error: "Something already sent cannot be deleted." });
    }

    await db.delete(broadcasts).where(eq(broadcasts.id, request.params.id));
    return { ok: true };
  });

  // What it will look like, and what the sender would do with it.
  app.get("/admin/broadcasts/:id/preview", { preHandler: requireAdmin() }, async (request, reply) => {
    const [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, request.params.id));
    if (!row) return reply.code(404).send({ error: "No such announcement" });

    const letter = renderIssue(row, { newsletter: false });
    return {
      subject: letter.subject,
      html: letter.html,
      // Said plainly on the screen, because it is the consequence of the
      // choice above it and nobody should have to know the rules to see it.
      reachesSuppressed: isUnavoidable(row.reasonCategory),
      problem: whyNotSendable(row),
    };
  });

  // How many people. Asked fresh, because the number somebody agrees to has
  // to be the number that will actually be written to.
  app.get("/admin/broadcasts/:id/audience", { preHandler: requireAdmin() }, async (request) => {
    const [total, waiting] = await Promise.all([
      countAudience(),
      countWaiting(request.params.id),
    ]);
    return { total, waiting };
  });

  app.post("/admin/broadcasts/:id/test", { preHandler: requireAdmin() }, async (request, reply) => {
    const [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, request.params.id));
    if (!row) return reply.code(404).send({ error: "No such announcement" });

    const to = String(request.body?.to || request.user.email).trim();
    const letter = renderIssue(row, { newsletter: false });

    try {
      const answer = await mailer.send({
        to,
        kind: row.class,
        reasonCategory: row.reasonCategory,
        template: "broadcast-test",
        replyTo: config.EMAIL_REPLY_TO,
        subject: `[Test] ${letter.subject}`,
        html: letter.html,
        text: letter.text,
      });

      if (answer?.blocked) {
        return reply.code(409).send({ error: `No test copy went to ${to}: ${answer.reason}`, blocked: true });
      }
    } catch (error) {
      request.log.error({ err: error, to }, "announcement test failed");
      return reply.code(502).send({ error: "That test copy could not be sent." });
    }

    return { ok: true, to };
  });

  app.post("/admin/broadcasts/:id/send", { preHandler: requireAdmin() }, async (request, reply) => {
    const [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, request.params.id));
    if (!row) return reply.code(404).send({ error: "No such announcement" });

    const refusal = whyNotSendable(row);
    if (refusal) return reply.code(400).send({ error: refusal });
    if (isSending(row.id)) return reply.code(409).send({ error: "It is already going out." });

    // The number they were shown has to be the number they agreed to. If it
    // moved between the screen and the press, they are asked again rather
    // than having the difference sent on their behalf.
    const agreed = Number(request.body?.audienceCount);
    const now = await countAudience();
    if (!Number.isFinite(agreed) || agreed !== now) {
      return reply.code(409).send({
        error: `The number of people changed. It is now ${now}. Check and send again.`,
        audienceCount: now,
      });
    }

    await db
      .update(broadcasts)
      .set({
        audienceCount: now,
        sentByEmail: request.user.email,
        status: "sending",
        updatedAt: new Date(),
      })
      .where(eq(broadcasts.id, row.id));

    // Answers at once and works through the list behind it, so a long send
    // does not hold the request open.
    deliver(app, row.id).catch((error) => app.log.error({ err: error }, "announcement send failed"));

    return { ok: true, sending: true, audienceCount: now };
  });
}
