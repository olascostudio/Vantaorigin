// What is happening across VantaOrigin, for whoever runs it.
//
// Reading only, apart from settling a report. Who counts as an admin comes
// from ADMIN_EMAILS, so access is granted or taken away by editing a setting
// rather than by changing the database.
import { z } from "zod";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import {
  characterLikes,
  characters,
  highlights,
  reports,
  users,
} from "../db/schema.js";
import { authenticate } from "../auth/auth.js";

const adminEmails = () =>
  new Set(
    config.ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

export const isAdmin = (user) => Boolean(user) && adminEmails().has(user.email.toLowerCase());

// Signed in AND on the list. Anyone else is told the route does not exist,
// rather than that they are not allowed: there is nothing to be learned here.
function requireAdmin() {
  const signedIn = authenticate();
  return async (request, reply) => {
    await signedIn(request, reply);
    if (reply.sent) return;
    if (!isAdmin(request.user)) {
      return reply.code(404).send({ error: "Not found" });
    }
  };
}

const since = (days) => new Date(Date.now() - days * 86_400_000);

export default async function adminRoutes(app) {
  // Does this account see the dashboard at all? Answered for any signed-in
  // person, so the app can decide whether to show the way in.
  app.get("/admin/me", { preHandler: authenticate({ required: false }) }, async (request) => ({
    admin: isAdmin(request.user),
  }));

  // The numbers on the front page of the dashboard.
  app.get("/admin/overview", { preHandler: requireAdmin() }, async () => {
    const week = since(7);
    const single = async (query) => Number((await query)[0]?.value ?? 0);

    const [
      creators,
      creatorsThisWeek,
      verified,
      allCharacters,
      publicCharacters,
      charactersThisWeek,
      posts,
      likes,
      openReports,
    ] = await Promise.all([
      single(db.select({ value: count() }).from(users)),
      single(db.select({ value: count() }).from(users).where(gte(users.createdAt, week))),
      single(
        db.select({ value: count() }).from(users).where(sql`${users.emailVerifiedAt} is not null`)
      ),
      single(db.select({ value: count() }).from(characters)),
      single(db.select({ value: count() }).from(characters).where(eq(characters.isPublic, true))),
      single(db.select({ value: count() }).from(characters).where(gte(characters.createdAt, week))),
      single(db.select({ value: count() }).from(highlights)),
      single(db.select({ value: count() }).from(characterLikes)),
      single(db.select({ value: count() }).from(reports).where(eq(reports.status, "open"))),
    ]);

    return {
      creators: { total: creators, verified, thisWeek: creatorsThisWeek },
      characters: { total: allCharacters, public: publicCharacters, thisWeek: charactersThisWeek },
      posts,
      likes,
      openReports,
    };
  });

  // The newest creators, with enough to tell a real one from a test account.
  app.get("/admin/creators", { preHandler: requireAdmin() }, async (request) => {
    const limit = Math.min(Number(request.query.limit) || 50, 200);
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        characters: sql`(select count(*) from characters c where c.user_id = users.id)::int`.as(
          "characters"
        ),
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    return rows.map((row) => ({ ...row, emailVerified: Boolean(row.emailVerifiedAt) }));
  });

  // What people are looking at: the most liked characters.
  app.get("/admin/characters", { preHandler: requireAdmin() }, async (request) => {
    const limit = Math.min(Number(request.query.limit) || 50, 200);
    return db
      .select({
        id: characters.id,
        name: characters.name,
        isPublic: characters.isPublic,
        coverUrl: characters.coverUrl,
        createdAt: characters.createdAt,
        creator: users.username,
        likes: sql`(select count(*) from character_likes l where l.character_id = characters.id)::int`.as(
          "likes"
        ),
      })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.userId))
      .orderBy(desc(sql`likes`), desc(characters.createdAt))
      .limit(limit);
  });

  // Reports, newest first. "open" by default, since those are the ones
  // waiting on somebody.
  app.get("/admin/reports", { preHandler: requireAdmin() }, async (request) => {
    const status = ["open", "reviewed", "dismissed", "all"].includes(request.query.status)
      ? request.query.status
      : "open";

    const reporter = { id: users.id, username: users.username, email: users.email };
    const rows = await db
      .select({
        id: reports.id,
        reason: reports.reason,
        message: reports.message,
        status: reports.status,
        createdAt: reports.createdAt,
        characterId: reports.characterId,
        subjectUserId: reports.subjectUserId,
        reporter,
      })
      .from(reports)
      .leftJoin(users, eq(users.id, reports.reporterId))
      .where(status === "all" ? undefined : eq(reports.status, status))
      .orderBy(desc(reports.createdAt))
      .limit(200);

    // The creator a report is about, named rather than left as an id.
    const subjects = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users);
    const byId = new Map(subjects.map((row) => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      subject: byId.get(row.subjectUserId) ?? null,
      reporter: row.reporter?.id ? row.reporter : null,
    }));
  });

  // Settling one: looked at and acted on, or nothing in it.
  app.patch("/admin/reports/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const { status } = z
      .object({ status: z.enum(["open", "reviewed", "dismissed"]) })
      .parse(request.body);

    const [updated] = await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, request.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "Report not found" });
    return { ok: true, status: updated.status };
  });
}
