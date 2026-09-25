// Reporting a creator. Raised from a character page or a Realm, so the
// request may name either a character or a username; both lead to the person
// the report is about.
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { characters, reports, users } from "../db/schema.js";
import { authenticate } from "../auth/auth.js";

// The reasons the screen offers, plus room to say more.
const REASONS = ["copyright", "inappropriate", "harassment", "spam", "other"];

const reportBody = z
  .object({
    characterId: z.string().uuid().optional(),
    username: z.string().min(1).max(40).optional(),
    reason: z.enum(REASONS),
    message: z.string().max(1000).optional(),
  })
  .refine((body) => body.characterId || body.username, {
    message: "Say which creator this is about",
  });

export default async function reportRoutes(app) {
  // Signing in is required: a report nobody stands behind cannot be weighed,
  // and without it the same person could file the same complaint all day.
  app.post("/reports", { preHandler: authenticate() }, async (request, reply) => {
    const body = reportBody.parse(request.body);

    let subjectId = null;
    let characterId = null;

    if (body.characterId) {
      const [character] = await db
        .select({ id: characters.id, userId: characters.userId })
        .from(characters)
        .where(eq(characters.id, body.characterId))
        .limit(1);

      if (!character) return reply.code(404).send({ error: "Character not found" });
      subjectId = character.userId;
      characterId = character.id;
    } else {
      const handle = body.username.replace(/^@+/, "").toLowerCase();
      const [creator] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, `@${handle}`))
        .limit(1);

      if (!creator) return reply.code(404).send({ error: "That creator does not exist" });
      subjectId = creator.id;
    }

    if (subjectId === request.user.id) {
      return reply.code(400).send({ error: "You cannot report yourself" });
    }

    // Already reported and not yet dealt with: take no second copy, and say
    // the same thing back, so nothing turns on whether this is a repeat.
    const [existing] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, request.user.id),
          eq(reports.subjectUserId, subjectId),
          eq(reports.status, "open")
        )
      )
      .limit(1);

    if (existing) return reply.code(201).send({ ok: true, alreadyReported: true });

    await db.insert(reports).values({
      reporterId: request.user.id,
      subjectUserId: subjectId,
      characterId,
      reason: body.reason,
      message: body.message?.trim() || "",
    });

    return reply.code(201).send({ ok: true, alreadyReported: false });
  });
}
